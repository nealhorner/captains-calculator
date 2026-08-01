import React from 'react';
import { Group, Stack, Input, Button, Tabs } from '@mantine/core';
import { Icon } from '@iconify/react';

import Icons from 'components/ui/Icons';
import { useSearchParams } from 'react-router-dom';
import classes from './PageFilters.module.css';

type ClickFilterConfig<T> = {
  label: string;
  filter: T;
};

type useFiltersProps<
  FilterType extends FilterTypeBase = null,
  ItemType extends Record<string, any> = {},
  RelationTypes extends Record<string, any> = {},
> = {
  baseFilters: FilterType;
  clickFilters: FilterType;
  searchFilterFields: (keyof ItemType)[];
  searchFilterRelations?: {
    [K in keyof RelationTypes]: (keyof RelationTypes[K])[];
  };
  clickFilterField: keyof ItemType;
  clickFilterValues: {
    [index: string]: ClickFilterConfig<FilterType>;
  };
};

type FilterVariablesType = {
  where: {
    _and: any[];
  };
};

type ClickFilterType = {
  index: number;
  value: string;
};

type FilterTypeBase = any[] | undefined | null;

export function usePageFilters<
  FilterType extends FilterTypeBase = null,
  ItemType extends Record<string, any> = {},
  RelationTypes extends Record<string, any> = {},
>(props: useFiltersProps<FilterType, ItemType, RelationTypes>) {
  let [searchParams, setSearchParams] = useSearchParams();

  const [baseFilters] = React.useState<FilterType>(props.baseFilters);
  const [clickFilters, setClickFilters] = React.useState<FilterType>(props.clickFilters);
  const [searchFilters, setSearchFilters] = React.useState<FilterType>([] as unknown as FilterType);

  const [clickFilter, setClickFilter] = React.useState<ClickFilterType>({ index: 0, value: 'all' });
  const [searchFilter, setSearchFilter] = React.useState<string>('');
  const [searchFilterActive, setSearchFilterActive] = React.useState<boolean>(false);

  const queryParamFiltersApplied = React.useRef(false);

  const [filters, setFilters] = React.useState<FilterVariablesType>({
    where: {
      _and: [
        ...((props.baseFilters as FilterTypeBase) || []),
        ...((clickFilters as FilterTypeBase) || []),
        ...((searchFilters as FilterTypeBase) || []),
      ],
    },
  });

  React.useEffect(() => {
    setFilters({
      where: {
        _and: [
          ...((baseFilters as FilterTypeBase) || []),
          ...((clickFilters as FilterTypeBase) || []),
          ...((searchFilters as FilterTypeBase) || []),
        ],
      },
    });
  }, [baseFilters, searchFilters, clickFilters]);

  const handleClickFilterChanged = React.useCallback(
    (index: number, value: string) => {
      setClickFilter({ index, value });
      if (value === 'all') {
        setClickFilters(props.clickFilters);
      } else {
        setClickFilters(props.clickFilterValues[value].filter);
      }
    },
    [props.clickFilters, props.clickFilterValues],
  );

  React.useEffect(() => {
    if (!queryParamFiltersApplied.current) {
      for (var searchParamKey of searchParams.keys()) {
        if (props.clickFilterValues && props.clickFilterField === searchParamKey) {
          let searchParamValue = searchParams.get(searchParamKey);
          if (searchParamValue) {
            let clickFilterIndex = Object.keys(props.clickFilterValues).indexOf(searchParamValue);
            if (clickFilterIndex >= 0) {
              handleClickFilterChanged(clickFilterIndex + 1, searchParamValue);
            }
          }
        }
      }
      queryParamFiltersApplied.current = true;
    }
  }, [searchParams, handleClickFilterChanged, props.clickFilterValues, props.clickFilterField]);

  const onSearchFilterChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchFilterActive(false);
    setSearchFilter(e.target.value);
  };

  const onSearchFilterGo = () => {
    if (
      searchFilter.length > 2 &&
      (props.searchFilterFields.length ||
        (props.searchFilterRelations && Object.keys(props.searchFilterRelations).length))
    ) {
      setSearchFilterActive(true);

      let basicFilters = {
        _or: props.searchFilterFields.map((field) => {
          return { [field]: { _ilike: `%${searchFilter}%` } };
        }),
      };

      let relationFilters = {
        _or: props.searchFilterRelations
          ? Object.keys(props.searchFilterRelations).reduce((currentFilters, relationKey) => {
              if (props.searchFilterRelations) {
                let relationFields = props.searchFilterRelations[relationKey];
                return {
                  [relationKey]: {
                    _or: relationFields.map((relationField) => {
                      return { [relationField]: { _ilike: `%${searchFilter}%` } };
                    }),
                  },
                };
              }
              return currentFilters;
            }, {})
          : {},
      };

      setSearchFilters([{ ...basicFilters, ...relationFilters }] as FilterType);
    }
  };

  const onSearchFilterClear = () => {
    setSearchFilter('');
    setSearchFilterActive(false);
    setSearchFilters([] as unknown as FilterType);
  };

  const onClickFilterChanged = (index: number, value: string) => {
    handleClickFilterChanged(index, value);
    setSearchParams([]);
  };

  const onSearchFilterKeyUp = (event: React.KeyboardEvent) => {
    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      onSearchFilterGo();
    }
  };

  const clickFilterItems = Object.keys(props.clickFilterValues).map((i) => {
    let item = props.clickFilterValues[i];
    return {
      label: item.label,
      value: i,
    };
  });

  return {
    filters,
    filterParams: {
      searchFilter,
      onSearchFilterChanged,
      onSearchFilterGo,
      onSearchFilterClear,
      onSearchFilterKeyUp,
      searchFilterActive,
      clickFilter,
      onClickFilterChanged,
      clickFilterItems,
    },
  };
}

type FilterComponentProps = {
  options: {
    searchFilter: string;
    searchFilterActive: boolean;
    clickFilter: ClickFilterType;
    clickFilterItems: { label: string; value: string }[];
    onSearchFilterChanged(e: React.ChangeEvent<HTMLInputElement>): void;
    onSearchFilterGo(): void;
    onSearchFilterClear(): void;
    onSearchFilterKeyUp(event: React.KeyboardEvent): void;
    onClickFilterChanged(index: number, value: string): void;
  };
};

export const PageFilters: React.FC<FilterComponentProps> = ({ options }) => {
  const renderClickFilter = (grow: boolean = false) => {
    return (
      <Tabs
        value={options.clickFilter.value ?? 'all'}
        onChange={(value) => {
          const index =
            value === 'all' ? 0 : options.clickFilterItems.findIndex((f) => f.value === value) + 1;
          options.onClickFilterChanged(index, value ?? 'all');
        }}
        variant="unstyled"
        classNames={{ tab: classes.tab }}
      >
        <Tabs.List grow={grow}>
          <Tabs.Tab value="all">All</Tabs.Tab>
          {options.clickFilterItems.map((f, k) => (
            <Tabs.Tab key={k} value={f.value}>
              {f.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    );
  };

  const renderSearchFilter = () => {
    return (
      <Input
        leftSection={<Icon icon={Icons.search} />}
        placeholder="Search..."
        classNames={{ input: classes.searchInput, section: classes.searchInputSection }}
        rightSection={
          <Button
            size="xs"
            variant="subtle"
            color={
              options.searchFilter.length >= 2
                ? options.searchFilterActive
                  ? 'red'
                  : 'blue'
                : 'gray'
            }
            onClick={
              options.searchFilterActive ? options.onSearchFilterClear : options.onSearchFilterGo
            }
            px={3}
          >
            <Icon icon={options.searchFilterActive ? Icons.cancel : Icons.go} width={24} />
          </Button>
        }
        onKeyPress={options.onSearchFilterKeyUp}
        disabled={options.searchFilterActive}
        value={options.searchFilter}
        onChange={options.onSearchFilterChanged}
      />
    );
  };

  return (
    <React.Fragment>
      <Group justify="space-between" mb="md" align="center" visibleFrom="xs">
        {renderClickFilter()}
        {renderSearchFilter()}
      </Group>
      <Stack mb="md" hiddenFrom="xs">
        {renderClickFilter(true)}
        {renderSearchFilter()}
      </Stack>
    </React.Fragment>
  );
};
