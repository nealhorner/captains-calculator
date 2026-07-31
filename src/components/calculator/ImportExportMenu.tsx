import React from 'react';
import { Button, Group } from '@mantine/core';
import { Icon } from '@iconify/react';
import { useModals } from '@mantine/modals';
import { showNotification } from '@mantine/notifications';

import { useActions, useAppState } from 'state';
import Icons from 'components/ui/Icons';
import { downloadTextFile } from 'utils/download';

export const ImportExportMenu = () => {

    const { nodesList } = useAppState(state => state.recipes)
    const exportGraph = useActions().recipes.exportGraph
    const importGraph = useActions().recipes.importGraph

    const modals = useModals();
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const filenameStamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')

    const handleExportJson = () => {
        const graph = exportGraph()
        downloadTextFile(`captains-calculator-${filenameStamp()}.json`, JSON.stringify(graph, null, 2), 'application/json')
    }

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const notifyImportFailed = (message: string) => {
        showNotification({
            icon: <Icon icon={Icons.failCircle} />,
            color: 'red',
            title: 'Import Failed',
            message
        })
    }

    const runImport = (text: string) => {
        let data: unknown
        try {
            data = JSON.parse(text)
        } catch {
            notifyImportFailed('That file is not valid JSON.')
            return
        }

        const result = importGraph(data)

        if (result.imported === 0 && result.errors.length) {
            notifyImportFailed(result.errors[0])
            return
        }

        showNotification({
            icon: <Icon icon={Icons.successCircle} />,
            color: 'green',
            title: 'Import Complete',
            message: result.skipped
                ? `Imported ${result.imported} node(s), skipped ${result.skipped}. ${result.errors.join(' ')}`
                : `Imported ${result.imported} node(s).`
        })
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return

        const reader = new FileReader()
        reader.onload = () => runImport(String(reader.result ?? ''))
        reader.onerror = () => notifyImportFailed('The file could not be read.')
        reader.readAsText(file)
    }

    const confirmImport = () => {
        if (!nodesList.length) {
            handleImportClick()
            return
        }
        modals.openConfirmModal({
            title: 'Import Production Chain',
            centered: true,
            children: 'Importing a file will replace your current production chain. This cannot be undone. Continue?',
            confirmProps: { color: 'red' },
            labels: { confirm: 'Import & Replace', cancel: 'Cancel' },
            onConfirm: handleImportClick
        })
    }

    return (
        <Group grow>
            <input
                type="file"
                accept="application/json,.json"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <Button variant="default" leftIcon={<Icon icon={Icons.download} />} disabled={!nodesList.length} onClick={handleExportJson}>
                Export
            </Button>
            <Button variant="default" leftIcon={<Icon icon={Icons.upload} />} onClick={confirmImport}>
                Import
            </Button>
        </Group>
    )

}
