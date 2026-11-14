'use strict';

/**
 * CustomTable - A simple table implementation
 * Features: sorting, filtering, column visibility toggle
 */

// eslint-disable-next-line no-unused-vars
class CustomTable {
  constructor(selector, options) {
    this.selector = selector;
    this.container = document.querySelector(selector);
    this.options = options || {};
    this.data = this.options.data || [];
    this.columns = this.options.columns || [];
    this.filteredData = [...this.data];
    this.filters = {};
    this.sortField = null;
    this.sortDirection = 'asc';
    this.onUpdate = this.options.onUpdate || null;
    this.table = null;
    this.thead = null;
    this.debounceTimer = null;
    this.render();
  }

  debounce(func, delay) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(func, delay);
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.thead = null;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';

    this.table = document.createElement('table');
    this.table.className = 'custom-table';

    this.renderHeader();
    wrapper.appendChild(this.table);
    this.container.appendChild(wrapper);
    this.renderBody();
  }

  renderHeader() {
    if (!this.table) return;

    this.thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    this.columns.forEach((column, index) => {
      const th = document.createElement('th');
      th.className = 'table-header';
      th.dataset.columnIndex = String(index);
      th.classList.toggle('hidden', column.visible === false);

      const headerContent = document.createElement('div');
      headerContent.className = 'header-content';

      const titleContainer = document.createElement('div');
      titleContainer.className = 'header-title-container';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'header-title';
      titleSpan.textContent = column.title;
      titleContainer.appendChild(titleSpan);

      const sepSpan = document.createElement('span');
      sepSpan.className = 'header-separator';
      titleContainer.appendChild(sepSpan);

      if (column.sorter) {
        const sortIcon = document.createElement('span');
        sortIcon.className = 'sort-indicator';
        sortIcon.addEventListener('click', () => this.sort(column.field, column.sortFunc));
        this.updateSortIndicator(sortIcon, column.field, column.sorter);
        titleContainer.appendChild(sortIcon);
      }

      if (column.isHidable) {
        const hideIcon = document.createElement('span');
        hideIcon.className = 'hide-column-icon';
        hideIcon.title = 'Hide this column';
        hideIcon.textContent = '⊘';
        hideIcon.addEventListener('click', (event) => {
          event.stopPropagation();
          this.hideColumn(column);
        });
        titleContainer.appendChild(hideIcon);
      }

      headerContent.appendChild(titleContainer);

      if (column.headerFilter) {
        const filterDiv = this.createFilterControl(column);
        if (filterDiv) {
          headerContent.appendChild(filterDiv);
        }
      }

      th.appendChild(headerContent);
      headerRow.appendChild(th);
    });

    this.thead.appendChild(headerRow);
    this.table.appendChild(this.thead);
  }

  createFilterControl(column) {
    const filterDiv = document.createElement('div');
    filterDiv.className = 'header-filter';

    if (column.headerFilter === 'checkbox') {
      const label = document.createElement('label');
      label.className = 'filter-checkbox-label';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.field = column.field;
      checkbox.className = 'filter-checkbox';
      checkbox.setAttribute('aria-label', column.headerFilterParams?.ariaLabel || `Filter ${column.title}`);
      checkbox.addEventListener('change', () => {
        this.setFilter(column.field, checkbox.checked, column.headerFilterFunc, column.headerFilterNormalize);
      });

      label.appendChild(checkbox);
      filterDiv.appendChild(label);
      return filterDiv;
    }

    if (column.headerFilter === 'list' && column.headerFilterParams?.values) {
      const select = document.createElement('select');
      select.dataset.field = column.field;
      select.className = 'filter-select';

      const allOption = document.createElement('option');
      allOption.value = '';
      allOption.textContent = 'All';
      select.appendChild(allOption);

      for (const value of column.headerFilterParams.values) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      }

      select.addEventListener('change', (event) => {
        this.setFilter(column.field, event.target.value, column.headerFilterFunc, column.headerFilterNormalize);
      });
      filterDiv.appendChild(select);
      return filterDiv;
    }

    if (column.headerFilter === true) {
      if (column.headerFilterInputs) {
        for (const inputConfig of column.headerFilterInputs) {
          filterDiv.appendChild(this.createHeaderFilterInput(inputConfig, column));
        }
        return filterDiv;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'filter-input-wrapper';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Filter...';
      input.setAttribute('aria-label', `Filter ${column.title}`);
      input.dataset.field = column.field;
      input.className = 'filter-input';

      const clearBtn = document.createElement('button');
      clearBtn.className = 'filter-clear-btn';
      clearBtn.textContent = '×';
      clearBtn.type = 'button';
      clearBtn.title = 'Clear filter';

      this.bindTextFilter(wrapper, input, clearBtn, column.field, column.headerFilterFunc, column.headerFilterNormalize);

      wrapper.appendChild(input);
      wrapper.appendChild(clearBtn);
      filterDiv.appendChild(wrapper);
      return filterDiv;
    }

    return null;
  }

  bindTextFilter(wrapper, input, clearBtn, field, filterFunc, normalizeFunc) {
    const updateFilter = () => {
      const filterValue = this.getFilterValues(field, wrapper.closest('.header-filter'));
      const hasContent = this.filterHasContent(filterValue);
      wrapper.classList.toggle('has-content', hasContent);
      this.debounce(() => this.setFilter(field, filterValue, filterFunc, normalizeFunc), 300);
    };

    input.addEventListener('input', updateFilter);
    clearBtn.addEventListener('click', (event) => {
      event.preventDefault();
      input.value = '';
      updateFilter();
    });
  }

  createHeaderFilterInput(inputConfig, column) {
    const wrapper = document.createElement('div');
    wrapper.className = 'filter-input-wrapper';

    if (inputConfig.values && Array.isArray(inputConfig.values)) {
      const select = document.createElement('select');
      select.className = 'filter-select';
      select.dataset.field = column.field;
      select.dataset.filterKey = inputConfig.key;

      const allOption = document.createElement('option');
      allOption.value = '';
      allOption.textContent = inputConfig.placeholder || 'All';
      select.appendChild(allOption);

      for (const valueItem of inputConfig.values) {
        const option = document.createElement('option');
        const value = typeof valueItem === 'string' ? valueItem : (valueItem.value || valueItem);
        const display = typeof valueItem === 'string' ? valueItem : (valueItem.display || valueItem.value || valueItem);
        option.value = value;
        option.textContent = display;
        select.appendChild(option);
      }

      select.addEventListener('change', () => {
        this.setFilter(column.field, this.getFilterValues(column.field, wrapper.parentElement), column.headerFilterFunc, column.headerFilterNormalize);
      });

      wrapper.appendChild(select);
      return wrapper;
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = inputConfig.placeholder || 'Filter...';
    input.dataset.field = column.field;
    input.dataset.filterKey = inputConfig.key;
    input.className = 'filter-input';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'filter-clear-btn';
    clearBtn.textContent = '×';
    clearBtn.type = 'button';
    clearBtn.title = 'Clear filter';

    input.addEventListener('input', () => {
      const filterValues = this.getFilterValues(column.field, wrapper.parentElement);
      const hasContent = this.filterHasContent(filterValues);
      wrapper.classList.toggle('has-content', hasContent);
      this.debounce(() => this.setFilter(column.field, filterValues, column.headerFilterFunc, column.headerFilterNormalize), 300);
    });

    clearBtn.addEventListener('click', (event) => {
      event.preventDefault();
      input.value = '';
      const filterValues = this.getFilterValues(column.field, wrapper.parentElement);
      this.setFilter(column.field, filterValues, column.headerFilterFunc, column.headerFilterNormalize);
    });

    wrapper.appendChild(input);
    wrapper.appendChild(clearBtn);
    return wrapper;
  }

  filterHasContent(value) {
    if (typeof value === 'string') {
      return value !== '';
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some((entry) => entry !== '');
    }
    return false;
  }

  getFilterValues(field, filterDivContext = null) {
    const filterDiv = filterDivContext || this.table?.querySelector('.header-filter');
    if (!filterDiv) return '';

    const controls = filterDiv.querySelectorAll(`[data-field="${field}"]`);
    if (controls.length === 0) return '';
    if (controls.length === 1) return controls[0].value;

    const values = {};
    controls.forEach((control) => {
      const key = control.dataset.filterKey || 'value';
      values[key] = control.value;
    });

    return values;
  }

  getNestedValue(obj, field) {
    if (!field) return undefined;
    return field.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  normalizeComparable(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.toLowerCase();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value).toLowerCase();
    return JSON.stringify(value).toLowerCase();
  }

  sort(field, sortFunc) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.filteredData.sort((a, b) => {
      let valA = this.getNestedValue(a, field);
      let valB = this.getNestedValue(b, field);
      let comparison;

      if (sortFunc) {
        comparison = sortFunc(valA, valB, a, b);
      } else {
        valA = this.normalizeComparable(valA);
        valB = this.normalizeComparable(valB);

        if (valA < valB) comparison = -1;
        else if (valA > valB) comparison = 1;
        else comparison = 0;
      }

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.renderBody();
    this.updateSortIndicators();
  }

  updateSortIndicator(sortIcon, field) {
    const isCurrentField = this.sortField === field;
    sortIcon.textContent = isCurrentField ? (this.sortDirection === 'asc' ? '↑' : '↓') : '↕';
  }

  updateSortIndicators() {
    if (!this.thead) return;

    const headers = this.thead.querySelectorAll('th');
    this.columns.forEach((column, index) => {
      if (!column.sorter) return;
      const sortIcon = headers[index]?.querySelector('.sort-indicator');
      if (sortIcon) {
        this.updateSortIndicator(sortIcon, column.field);
      }
    });
  }

  getFilter(field) {
    if (!field) {
      return this.filters;
    }
    return this.filters[field];
  }

  clearFilters() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    this.filters = {};

    this.container?.querySelectorAll('.filter-input, .filter-select').forEach((control) => {
      control.value = '';
      control.closest('.filter-input-wrapper')?.classList.remove('has-content');
    });
    this.container?.querySelectorAll('.filter-checkbox').forEach((checkbox) => {
      checkbox.checked = false;
    });

    this.applyFilters();
  }

  normalizeFilterValue(value, normalize) {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string') {
      return normalize ? normalize(value) : value;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, normalize ? normalize(item) : String(item || '')])
      );
    }

    return normalize ? normalize(value) : String(value || '');
  }

  setFilter(field, value, filterFunc, normalizeFunc) {
    const fallbackNormalize = normalizeFunc || ((entry) => String(entry || ''));

    if (value === '' && !filterFunc && !normalizeFunc) {
      delete this.filters[field];
    } else {
      this.filters[field] = {
        value,
        func: filterFunc,
        normalize: fallbackNormalize
      };
    }

    this.applyFilters();
  }

  applyFilters() {
    this.filteredData = this.data.filter((row) => {
      for (const [field, filter] of Object.entries(this.filters)) {
        const cellValue = this.getNestedValue(row, field);
        const normalizedFilterValue = this.normalizeFilterValue(filter.value, filter.normalize);

        if (filter.func) {
          if (!filter.func(normalizedFilterValue, cellValue)) {
            return false;
          }
          continue;
        }

        const isEmpty = typeof normalizedFilterValue === 'string'
          ? normalizedFilterValue === ''
          : Object.values(normalizedFilterValue || {}).every((value) => value === '');

        if (isEmpty) {
          continue;
        }

        const searchTerms = typeof normalizedFilterValue === 'string'
          ? [normalizedFilterValue]
          : Object.values(normalizedFilterValue).filter((value) => value !== '');

        if (Array.isArray(cellValue)) {
          const matches = cellValue.some((entry) => {
            const normalizedEntry = this.normalizeFilterValue(entry, filter.normalize);
            return searchTerms.some((term) => String(normalizedEntry).includes(term));
          });
          if (!matches) {
            return false;
          }
          continue;
        }

        const normalizedCellValue = this.normalizeFilterValue(cellValue, filter.normalize);
        const matches = searchTerms.some((term) => String(normalizedCellValue).includes(term));
        if (!matches) {
          return false;
        }
      }

      return true;
    });

    this.renderBody();
  }

  getColumns() {
    return this.columns.reduce((obj, col) => {
      obj[col.title] = {
        getDefinition: () => col,
        hide: () => this.hideColumn(col),
        show: () => this.showColumn(col),
        getField: () => col.field
      };
      return obj;
    }, {});
  }

  hideColumn(column) {
    const col = typeof column === 'object' ? column : this.columns[column];
    if (!col) return;

    col.visible = false;
    const index = this.columns.indexOf(col);
    if (index === -1) return;

    const ths = this.table?.querySelectorAll('th');
    const cells = this.table?.querySelectorAll(`td[data-column-index="${index}"]`);
    ths?.[index]?.classList.add('hidden');
    cells?.forEach((cell) => cell.classList.add('hidden'));
  }

  showColumn(column) {
    const col = typeof column === 'object' ? column : this.columns[column];
    if (!col) return;

    col.visible = true;
    const index = this.columns.indexOf(col);
    if (index === -1) return;

    const ths = this.table?.querySelectorAll('th');
    const cells = this.table?.querySelectorAll(`td[data-column-index="${index}"]`);
    ths?.[index]?.classList.remove('hidden');
    cells?.forEach((cell) => cell.classList.remove('hidden'));
  }

  renderBody() {
    if (!this.table) return;

    const oldTbody = this.table.querySelector('tbody');
    if (oldTbody) oldTbody.remove();

    const tbody = document.createElement('tbody');
    const fragment = document.createDocumentFragment();

    this.filteredData.forEach((rowData, index) => {
      const row = document.createElement('tr');
      row.className = index % 2 === 0 ? 'even' : 'odd';
      row.dataset.index = String(index);

      this.columns.forEach((column, colIndex) => {
        const td = document.createElement('td');
        td.className = 'table-cell';
        td.dataset.columnIndex = String(colIndex);
        td.classList.toggle('hidden', column.visible === false);

        const cellValue = this.getNestedValue(rowData, column.field);

        if (column.formatter) {
          const mockCell = {
            getValue: () => cellValue,
            getData: () => rowData,
            getElement: () => td,
            getFilter: () => this.getFilter(column.field)
          };
          td.innerHTML = column.formatter(mockCell);
        } else if (Array.isArray(cellValue)) {
          td.innerHTML = cellValue.join('<br>');
        } else {
          td.textContent = cellValue || '';
        }

        if (column.cellClick) {
          td.style.cursor = 'pointer';
          const mockCell = { getValue: () => cellValue, getData: () => rowData };
          td.addEventListener('click', (event) => column.cellClick(event, mockCell));
        }

        row.appendChild(td);
      });

      fragment.appendChild(row);
    });

    tbody.appendChild(fragment);
    this.table.appendChild(tbody);
    this.restoreFilterValues();

    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  restoreFilterValues() {
    for (const [field, filter] of Object.entries(this.filters)) {
      const checkbox = this.container.querySelector(`input[type="checkbox"][data-field="${field}"]`);
      if (checkbox) {
        checkbox.checked = Boolean(filter.value);
      }

      const select = this.container.querySelector(`select[data-field="${field}"]:not([data-filter-key])`);
      if (select) {
        select.value = filter.value || '';
      }

      if (filter.value && typeof filter.value === 'object') {
        for (const [key, value] of Object.entries(filter.value)) {
          const input = this.container.querySelector(`input[data-field="${field}"][data-filter-key="${key}"]`);
          if (input) {
            input.value = value || '';
            const wrapper = input.closest('.filter-input-wrapper');
            if (wrapper) {
              wrapper.classList.toggle('has-content', Object.values(filter.value).some((entry) => entry !== ''));
            }
          }

          const selectControl = this.container.querySelector(`select[data-field="${field}"][data-filter-key="${key}"]`);
          if (selectControl) {
            selectControl.value = value || '';
            const wrapper = selectControl.closest('.filter-input-wrapper');
            if (wrapper) {
              wrapper.classList.toggle('has-content', Object.values(filter.value).some((entry) => entry !== ''));
            }
          }
        }
        continue;
      }

      const input = this.container.querySelector(`input[data-field="${field}"]`);
      if (input && !input.dataset.filterKey) {
        input.value = filter.value || '';
        const wrapper = input.closest('.filter-input-wrapper');
        if (wrapper) {
          wrapper.classList.toggle('has-content', filter.value !== '');
        }
      }

      const singleSelect = this.container.querySelector(`select[data-field="${field}"][data-filter-key]`);
      if (singleSelect && typeof filter.value === 'string') {
        singleSelect.value = filter.value || '';
        const wrapper = singleSelect.closest('.filter-input-wrapper');
        if (wrapper) {
          wrapper.classList.toggle('has-content', filter.value !== '');
        }
      }
    }
  }

  static trimLower(str) {
    return str ? str.trim().toLowerCase() : '';
  }

  redraw() {
    this.render();
  }
}
