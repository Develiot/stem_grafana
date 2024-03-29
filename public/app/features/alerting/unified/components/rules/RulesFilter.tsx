import { css } from '@emotion/css';
import { debounce } from 'lodash';
import React, { FormEvent, useState } from 'react';

import { DataSourceInstanceSettings, GrafanaTheme2, SelectableValue } from '@grafana/data';
import { Stack } from '@grafana/experimental';
import { DataSourcePicker, logInfo } from '@grafana/runtime';
import { Button, Field, Icon, Input, Label, RadioButtonGroup, useStyles2 } from '@grafana/ui';
import { useQueryParams } from 'app/core/hooks/useQueryParams';
import { PromAlertingRuleState, PromRuleType } from 'app/types/unified-alerting-dto';

import { LogMessages } from '../../Analytics';
import { useRulesFilter } from '../../hooks/useFilteredRules';
import { RuleHealth } from '../../search/rulesSearchParser';
import { alertStateToReadable } from '../../utils/rules';
import { HoverCard } from '../HoverCard';

const ViewOptions: SelectableValue[] = [
  {
    icon: 'folder',
    label: 'Grouped',
    value: 'grouped',
  },
  {
    icon: 'list-ul',
    label: 'List',
    value: 'list',
  },
  {
    icon: 'heart-rate',
    label: 'State',
    value: 'state',
  },
];

const RuleTypeOptions: SelectableValue[] = [
  {
    label: 'Alert ',
    value: PromRuleType.Alerting,
  },
  {
    label: 'Recording ',
    value: PromRuleType.Recording,
  },
];

const RuleHealthOptions: SelectableValue[] = [
  { label: 'Ok', value: RuleHealth.Ok },
  { label: 'No Data', value: RuleHealth.NoData },
  { label: 'Error', value: RuleHealth.Error },
];

interface RulesFilerProps {
  onFilterCleared?: () => void;
}

const RulesFilter = ({ onFilterCleared = () => undefined }: RulesFilerProps) => {
  const [queryParams, setQueryParams] = useQueryParams();

  // This key is used to force a rerender on the inputs when the filters are cleared
  const [filterKey, setFilterKey] = useState<number>(Math.floor(Math.random() * 100));
  const dataSourceKey = `dataSource-${filterKey}`;
  const queryStringKey = `queryString-${filterKey}`;

  const { filterState, hasActiveFilters, searchQuery, setSearchQuery, updateFilters } = useRulesFilter();

  const styles = useStyles2(getStyles);
  const stateOptions = Object.entries(PromAlertingRuleState).map(([key, value]) => ({
    label: alertStateToReadable(value),
    value,
  }));

  const handleDataSourceChange = (dataSourceValue: DataSourceInstanceSettings) => {
    updateFilters({ ...filterState, dataSourceName: dataSourceValue.name });
    setFilterKey((key) => key + 1);
  };

  const clearDataSource = () => {
    updateFilters({ ...filterState, dataSourceName: undefined });
    setFilterKey((key) => key + 1);
  };

  const handleQueryStringChange = debounce((e: FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    setSearchQuery(target.value);
  }, 600);

  const handleAlertStateChange = (value: PromAlertingRuleState) => {
    logInfo(LogMessages.clickingAlertStateFilters);
    updateFilters({ ...filterState, ruleState: value });
    setFilterKey((key) => key + 1);
  };

  const handleViewChange = (view: string) => {
    setQueryParams({ view });
  };

  const handleRuleTypeChange = (ruleType: PromRuleType) => {
    updateFilters({ ...filterState, ruleType });
    setFilterKey((key) => key + 1);
  };

  const handleRuleHealthChange = (ruleHealth: RuleHealth) => {
    updateFilters({ ...filterState, ruleHealth });
    setFilterKey((key) => key + 1);
  };

  const handleClearFiltersClick = () => {
    setSearchQuery(undefined);
    onFilterCleared();

    setTimeout(() => setFilterKey(filterKey + 1), 100);
  };

  const searchIcon = <Icon name={'search'} />;
  return (
    <div className={styles.container}>
      <Stack direction="column" gap={1}>
        <Stack direction="row" gap={1}>
          <Field className={styles.dsPickerContainer} label="Search by data source">
            <DataSourcePicker
              key={dataSourceKey}
              alerting
              noDefault
              placeholder="All data sources"
              current={filterState.dataSourceName}
              onChange={handleDataSourceChange}
              onClear={clearDataSource}
            />
          </Field>
          <div>
            <Label>State</Label>
            <RadioButtonGroup options={stateOptions} value={filterState.ruleState} onChange={handleAlertStateChange} />
          </div>
          <div>
            <Label>Rule type</Label>
            <RadioButtonGroup options={RuleTypeOptions} value={filterState.ruleType} onChange={handleRuleTypeChange} />
          </div>
          <div>
            <Label>Health</Label>
            <RadioButtonGroup
              options={RuleHealthOptions}
              value={filterState.ruleHealth}
              onChange={handleRuleHealthChange}
            />
          </div>
        </Stack>
        <Stack direction="column" gap={1}>
          <Stack direction="row" gap={1}>
            <Field
              className={styles.searchInput}
              label={
                <Label>
                  <Stack gap={0.5}>
                    <span>Search</span>
                    <HoverCard content={<SearchQueryHelp />}>
                      <Icon name="info-circle" size="sm" />
                    </HoverCard>
                  </Stack>
                </Label>
              }
            >
              <Input
                key={queryStringKey}
                prefix={searchIcon}
                onChange={handleQueryStringChange}
                defaultValue={searchQuery}
                placeholder="Search"
                data-testid="search-query-input"
              />
            </Field>
            <div>
              <Label>View as</Label>
              <RadioButtonGroup
                options={ViewOptions}
                value={String(queryParams['view'] ?? ViewOptions[0].value)}
                onChange={handleViewChange}
              />
            </div>
          </Stack>
          {hasActiveFilters && (
            <div>
              <Button fullWidth={false} icon="times" variant="secondary" onClick={handleClearFiltersClick}>
                Clear filters
              </Button>
            </div>
          )}
        </Stack>
      </Stack>
    </div>
  );
};

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css`
      margin-bottom: ${theme.spacing(1)};
    `,
    dsPickerContainer: css`
      width: 250px;
      flex-grow: 0;
      margin: 0;
    `,
    searchInput: css`
      flex: 1;
      margin: 0;
    `,
  };
};

function SearchQueryHelp() {
  const styles = useStyles2(helpStyles);

  return (
    <div>
      <div>Search syntax allows to query alert rules by the parameters defined below.</div>
      <hr />
      <div className={styles.grid}>
        <div>Filter type</div>
        <div>Expression</div>
        <HelpRow title="Datasource" expr="datasource:mimir" />
        <HelpRow title="Folder/Namespace" expr="namespace:global" />
        <HelpRow title="Group" expr="group:cpu-usage" />
        <HelpRow title="Rule" expr='rule:"cpu 80%"' />
        <HelpRow title="Labels" expr="label:team=A label:cluster=a1" />
        <HelpRow title="State" expr="state:firing|normal|pending" />
        <HelpRow title="Type" expr="type:alerting|recording" />
        <HelpRow title="Health" expr="health:ok|nodata|error" />
      </div>
    </div>
  );
}

function HelpRow({ title, expr }: { title: string; expr: string }) {
  const styles = useStyles2(helpStyles);

  return (
    <>
      <div>{title}</div>
      <code className={styles.code}>{expr}</code>
    </>
  );
}

const helpStyles = (theme: GrafanaTheme2) => ({
  grid: css`
    display: grid;
    grid-template-columns: max-content auto;
    gap: ${theme.spacing(1)};
    align-items: center;
  `,
  code: css`
    display: block;
    text-align: center;
  `,
});

export default RulesFilter;
