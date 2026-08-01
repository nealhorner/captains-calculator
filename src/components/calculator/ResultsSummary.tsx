import { Box, Image, Stack, Table, Alert, ScrollArea, Divider, Text, Tooltip } from '@mantine/core';

import { useAppState } from 'state';
import { needMap } from 'components/ui/NeedsBadge';
import { EPSILON, formatCount, formatRate } from 'utils/numbers';
import { dictValues } from 'utils/objects';
import ProductionNode, {
  RecipeIOExportProduct,
  RecipeIOImportProduct,
} from 'state/recipes/ProductionNode';
import { ChainTarget } from 'state/_types';
import React from 'react';

export const ResultsSummary = () => {
  const { nodesList, targetsList, nodes: allNodes } = useAppState((state) => state.recipes);
  const { items: allProducts } = useAppState((state) => state.products);

  let needs: { [index: string]: { label: string; icon: string; total: number; color: string } } = {
    workers: {
      icon: needMap['workers'].icon,
      label: 'Workers',
      total: 0,
      color: needMap['workers'].color,
    },
    electricity: {
      icon: needMap['electricity'].icon,
      label: 'Electricity',
      total: 0,
      color: needMap['electricity'].color,
    },
    maintenance1: {
      icon: needMap['maintenance1'].icon,
      label: 'Maintenance I',
      total: 0,
      color: needMap['maintenance1'].color,
    },
    maintenance2: {
      icon: needMap['maintenance2'].icon,
      label: 'Maintenance II',
      total: 0,
      color: needMap['maintenance2'].color,
    },
    unity: {
      icon: needMap['unity'].icon,
      label: 'Unity',
      total: 0,
      color: needMap['unity'].color,
    },
    computing: {
      icon: needMap['computing'].icon,
      label: 'Computing',
      total: 0,
      color: needMap['computing'].color,
    },
  };

  let costs: { [index: string]: { label: string; icon: string; total: number } } = {};
  let buildings: {
    [index: string]: { id: string; label: string; icon: string; total: number; utilised: number };
  } = {};
  let inputs: { [index: string]: { id: string; label: string; icon: string; total: number } } = {};
  let outputs: { [index: string]: { id: string; label: string; icon: string; total: number } } = {};
  // What the chain cannot supply itself and must be fed from outside.
  let rawInputs: { [index: string]: { id: string; label: string; icon: string; total: number } } =
    {};

  nodesList.forEach((recipe: ProductionNode) => {
    let machine = recipe.machine;
    // You can only build whole buildings, so construction-side figures use
    // the rounded-up count while running costs use the fractional one.
    let built = recipe.buildingsRequired;
    let running = recipe.machinesCount;

    if (!buildings.hasOwnProperty(machine.id)) {
      buildings[machine.id] = {
        id: machine.id,
        label: machine.name,
        icon: machine.icon,
        total: 0,
        utilised: 0,
      };
    }

    if (buildings.hasOwnProperty(machine.id)) {
      buildings[machine.id].total += built;
      buildings[machine.id].utilised += running;
    }

    // Needs

    needs.workers.total += machine.workers * built;
    needs.electricity.total += machine.electricity_consumed * running;
    if (machine.maintenance_cost_units === 'maintenance_i') {
      needs.maintenance1.total += machine.maintenance_cost_quantity * built;
    }
    if (machine.maintenance_cost_units === 'maintenance_ii') {
      needs.maintenance2.total += machine.maintenance_cost_quantity * built;
    }

    needs.unity.total += machine.unity_cost * built;
    needs.computing.total += machine.computing_consumed * running;

    // Costs
    machine.build_costs.forEach((product) => {
      let productData = allProducts[product.id];
      if (!costs.hasOwnProperty(product.id)) {
        costs[product.id] = {
          label: product.name,
          icon: productData.icon,
          total: 0,
        };
      }
      if (costs.hasOwnProperty(product.id)) {
        costs[product.id].total += product.quantity * built;
      }
    });

    dictValues<RecipeIOExportProduct>(recipe.outputs).forEach((output) => {
      if (!machine.isFarm && !machine.isStorage && !machine.isMine) {
        if (!outputs.hasOwnProperty(output.id)) {
          outputs[output.id] = {
            id: output.id,
            label: output.name,
            icon: output.icon,
            total: 0,
          };
        }
        if (outputs.hasOwnProperty(output.id)) {
          outputs[output.id].total += output.rate;
        }
      }
    });

    dictValues<RecipeIOImportProduct>(recipe.inputs).forEach((input) => {
      if (!machine.isFarm && !machine.isStorage && !machine.isMine) {
        if (!inputs.hasOwnProperty(input.id)) {
          inputs[input.id] = {
            id: input.id,
            label: input.name,
            icon: input.icon,
            total: 0,
          };
        }
        if (inputs.hasOwnProperty(input.id)) {
          inputs[input.id].total += input.rate;
        }
      }

      // Anything no node in the graph supplies has to come from elsewhere.
      if (input.deficit > EPSILON) {
        if (!rawInputs.hasOwnProperty(input.id)) {
          rawInputs[input.id] = {
            id: input.id,
            label: input.name,
            icon: input.icon,
            total: 0,
          };
        }
        rawInputs[input.id].total += input.deficit;
      }
    });
  });

  // Per-target progress: what was asked for against what the chain makes.
  let targetRows = targetsList
    .filter((target: ChainTarget) => target.productId && target.nodeId && allNodes[target.nodeId])
    .map((target: ChainTarget) => {
      let node = allNodes[target.nodeId!];
      let product = allProducts[target.productId!];
      let output = node.outputs[target.productId!];
      return {
        id: target.id,
        label: product ? product.name : target.productId!,
        icon: product ? product.icon : '',
        target: target.quantity,
        achieved: output ? output.rate : 0,
      };
    });

  const renderBuildings = () => {
    return (
      <Table
        horizontalSpacing={4}
        verticalSpacing={4}
        sx={{
          '& .fitwidth': {
            width: 1,
            whiteSpace: 'nowrap',
          },
        }}
      >
        <thead>
          <tr>
            <th colSpan={3}>Buildings</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(buildings).map((buildingId, k) => {
            let building = buildings[buildingId];
            if (building.total > 0) {
              return (
                <tr key={`costs-${buildingId}-${k}`}>
                  <td className="fitwidth">
                    <Box
                      p={4}
                      sx={(theme) => ({
                        borderRadius: theme.radius.sm,
                        border: `1px solid ${theme.colorScheme === 'light' ? theme.colors.gray[4] : theme.colors.dark[9]}`,
                        background: theme.colors.dark[5],
                      })}
                    >
                      <Image
                        height={16}
                        width={16}
                        src={`/assets/buildings/${building.icon}`}
                        alt={building.label}
                        sx={{ display: 'block', objectFit: 'contain' }}
                      />
                    </Box>
                  </td>
                  <td>{building.label}</td>
                  <td align="right">
                    x<strong>{building.total}</strong>
                    {Math.abs(building.utilised - building.total) > EPSILON && (
                      <Tooltip
                        label={`${formatCount(building.utilised)} buildings' worth of throughput`}
                        withArrow
                        withinPortal
                      >
                        <Text
                          component="span"
                          size="xs"
                          color="dimmed"
                        >{` (${formatCount(building.utilised)} used)`}</Text>
                      </Tooltip>
                    )}
                  </td>
                </tr>
              );
            }
            return null;
          })}
        </tbody>
      </Table>
    );
  };

  const renderCosts = () => {
    return (
      <Table
        horizontalSpacing={4}
        verticalSpacing={4}
        sx={{
          '& .fitwidth': {
            width: 1,
            whiteSpace: 'nowrap',
          },
        }}
      >
        <thead>
          <tr>
            <th colSpan={3}>Construction Costs</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(costs).map((costId, k) => {
            let cost = costs[costId];
            if (cost.total > 0) {
              return (
                <tr key={`costs-${costId}-${k}`}>
                  <td className="fitwidth">
                    <Box
                      p={6}
                      sx={(theme) => ({
                        borderRadius: theme.radius.sm,
                        border: `1px solid ${theme.colorScheme === 'light' ? theme.colors.gray[4] : theme.colors.dark[9]}`,
                        background: theme.colors.dark[5],
                      })}
                    >
                      <Image
                        height={12}
                        width={12}
                        src={`/assets/products/${cost.icon}`}
                        alt={cost.label}
                        sx={{ display: 'block', objectFit: 'contain' }}
                      />
                    </Box>
                  </td>
                  <td>{cost.label}</td>
                  <td align="right">
                    x<strong>{cost.total}</strong>
                  </td>
                </tr>
              );
            }
            return null;
          })}
        </tbody>
      </Table>
    );
  };

  const renderNeeds = () => {
    return (
      <Table
        horizontalSpacing={4}
        verticalSpacing={4}
        sx={{
          '& .fitwidth': {
            width: 1,
            whiteSpace: 'nowrap',
          },
        }}
      >
        <thead>
          <tr>
            <th colSpan={3}>Needs</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(needs).map((needId, k) => {
            let need = needs[needId];
            let iconFilter =
              needId === 'maintenance2'
                ? 'brightness(0) saturate(100%) invert(99%) sepia(95%) saturate(7485%) hue-rotate(323deg) brightness(104%) contrast(97%)'
                : '';
            if (need.total > 0) {
              return (
                <tr key={`needs-${needId}-${k}`}>
                  <td className="fitwidth">
                    <Box
                      sx={(theme) => ({
                        height: 24,
                        width: 24,
                        borderRadius: theme.radius.sm,
                        border: `1px solid ${theme.colorScheme === 'light' ? theme.colors.gray[4] : theme.colors.dark[9]}`,
                        background: need.color,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      })}
                    >
                      <Image
                        height={12}
                        width={12}
                        src={`/assets/ui/${need.icon}`}
                        alt={need.label}
                        sx={{ display: 'block', objectFit: 'contain' }}
                        styles={{ image: { filter: iconFilter } }}
                      />
                    </Box>
                  </td>
                  <td>{need.label}</td>
                  <td align="right">
                    x<strong>{formatRate(need.total)}</strong>
                  </td>
                </tr>
              );
            }
            return null;
          })}
        </tbody>
      </Table>
    );
  };

  const renderTotalOutputs = () => {
    return (
      <Table
        horizontalSpacing={4}
        verticalSpacing={4}
        sx={{
          '& .fitwidth': {
            width: 1,
            whiteSpace: 'nowrap',
          },
        }}
      >
        <thead>
          <tr>
            <th colSpan={3}>Gross Outputs (60s)</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(outputs).map((itemId, k) => {
            let item = outputs[itemId];
            if (item.total > 0) {
              return (
                <tr key={`outputs-${itemId}-${k}`}>
                  <td className="fitwidth">
                    <Box
                      p={6}
                      sx={(theme) => ({
                        borderRadius: theme.radius.sm,
                        border: `1px solid ${theme.colorScheme === 'light' ? theme.colors.gray[4] : theme.colors.dark[9]}`,
                        background: theme.colors.dark[5],
                      })}
                    >
                      <Image
                        height={12}
                        width={12}
                        src={`/assets/products/${item.icon}`}
                        alt={item.label}
                        sx={{ display: 'block', objectFit: 'contain' }}
                      />
                    </Box>
                  </td>
                  <td>{item.label}</td>
                  <td align="right">
                    x<strong>{formatRate(item.total)}</strong>
                  </td>
                </tr>
              );
            }
            return null;
          })}
        </tbody>
      </Table>
    );
  };

  const renderTotalInputs = () => {
    return (
      <Table
        horizontalSpacing={4}
        verticalSpacing={4}
        sx={{
          '& .fitwidth': {
            width: 1,
            whiteSpace: 'nowrap',
          },
        }}
      >
        <thead>
          <tr>
            <th colSpan={3}>Gross Inputs (60s)</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(inputs).map((itemId, k) => {
            let item = inputs[itemId];
            if (item.total > 0) {
              return (
                <tr key={`inputs-${itemId}-${k}`}>
                  <td className="fitwidth">
                    <Box
                      p={6}
                      sx={(theme) => ({
                        borderRadius: theme.radius.sm,
                        border: `1px solid ${theme.colorScheme === 'light' ? theme.colors.gray[4] : theme.colors.dark[9]}`,
                        background: theme.colors.dark[5],
                      })}
                    >
                      <Image
                        height={12}
                        width={12}
                        src={`/assets/products/${item.icon}`}
                        alt={item.label}
                        sx={{ display: 'block', objectFit: 'contain' }}
                      />
                    </Box>
                  </td>
                  <td>{item.label}</td>
                  <td align="right">
                    x<strong>{formatRate(item.total)}</strong>
                  </td>
                </tr>
              );
            }
            return null;
          })}
        </tbody>
      </Table>
    );
  };

  /** What each target asked for against what the chain actually produces. */
  const renderTargets = () => {
    return (
      <Table
        horizontalSpacing={4}
        verticalSpacing={4}
        sx={{
          '& .fitwidth': {
            width: 1,
            whiteSpace: 'nowrap',
          },
        }}
      >
        <thead>
          <tr>
            <th colSpan={3}>Targets (60s)</th>
          </tr>
        </thead>
        <tbody>
          {targetRows.map((item: (typeof targetRows)[number], k: number) => {
            let short = item.achieved < item.target - EPSILON;
            return (
              <tr key={`target-${item.id}-${k}`}>
                <td className="fitwidth">
                  <Box
                    p={6}
                    sx={(theme) => ({
                      borderRadius: theme.radius.sm,
                      border: `1px solid ${theme.colorScheme === 'light' ? theme.colors.gray[4] : theme.colors.dark[9]}`,
                      background: theme.colors.dark[5],
                    })}
                  >
                    <Image
                      height={12}
                      width={12}
                      src={`/assets/products/${item.icon}`}
                      alt={item.label}
                      sx={{ display: 'block', objectFit: 'contain' }}
                    />
                  </Box>
                </td>
                <td>{item.label}</td>
                <td align="right">
                  <Tooltip
                    label={
                      short
                        ? `Producing ${formatRate(item.achieved)} of ${formatRate(item.target)} — short by ${formatRate(item.target - item.achieved)}`
                        : `Target met`
                    }
                    withArrow
                    withinPortal
                  >
                    <Text component="span" size="sm" color={short ? 'red' : undefined}>
                      <strong>{formatRate(item.achieved)}</strong>
                      {short && ` / ${formatRate(item.target)}`}
                    </Text>
                  </Tooltip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  };

  /** Products the chain cannot make itself, i.e. what it must be fed. */
  const renderRawInputs = () => {
    return (
      <Table
        horizontalSpacing={4}
        verticalSpacing={4}
        sx={{
          '& .fitwidth': {
            width: 1,
            whiteSpace: 'nowrap',
          },
        }}
      >
        <thead>
          <tr>
            <th colSpan={3}>Raw Inputs (60s)</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(rawInputs).map((itemId, k) => {
            let item = rawInputs[itemId];
            return (
              <tr key={`raw-${itemId}-${k}`}>
                <td className="fitwidth">
                  <Box
                    p={6}
                    sx={(theme) => ({
                      borderRadius: theme.radius.sm,
                      border: `1px solid ${theme.colorScheme === 'light' ? theme.colors.gray[4] : theme.colors.dark[9]}`,
                      background: theme.colors.dark[5],
                    })}
                  >
                    <Image
                      height={12}
                      width={12}
                      src={`/assets/products/${item.icon}`}
                      alt={item.label}
                      sx={{ display: 'block', objectFit: 'contain' }}
                    />
                  </Box>
                </td>
                <td>{item.label}</td>
                <td align="right">
                  x<strong>{formatRate(item.total)}</strong>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  };

  return (
    <Box sx={{ position: 'relative', height: 'calc(100vh - 70px)' }}>
      <ScrollArea
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <Box p="md">
          <Divider label="Production Chain Summary" mb="sm" />

          <Stack spacing="xs">
            {nodesList.length ? (
              <React.Fragment>
                {!!targetRows.length && renderTargets()}
                {renderBuildings()}
                {renderCosts()}
                {renderNeeds()}
                {!!Object.keys(rawInputs).length && renderRawInputs()}
                {!!Object.keys(outputs).length && renderTotalOutputs()}
                {!!Object.keys(inputs).length && renderTotalInputs()}
              </React.Fragment>
            ) : (
              <Alert>Add a target product on the left to see a summary here.</Alert>
            )}
          </Stack>
        </Box>
      </ScrollArea>
    </Box>
  );
};
