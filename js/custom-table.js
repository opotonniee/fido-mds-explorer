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
    this.table = null; // Cache table element
    this.thead = null; // Cache header
    this.debounceTimer = null; // For debouncing filters
    this.render();
  }

  // Simple debounce utility
  debounce(func, delay) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(func, delay);
  }

  render() {
    this.container.innerHTML = '';
    this.table = document.createElement('table');
    this.table.className = 'custom-table';
    this.renderHeader();
    this.container.appendChild(this.table);
    this.renderBody();
  }

  renderHeader() {
    if (!this.thead) {
      this.thead = document.createElement('thead');
      const headerRow = document.createElement('tr');

      for (const column of this.columns) {
        const th = document.createElement('th');
        th.className = 'table-header';
        th.classList.toggle('hidden', column.visible === false);

        const headerContent = document.createElement('div');
        headerContent.className = 'header-content';

        // Title and hide icon container
        const titleContainer = document.createElement('div');
        titleContainer.className = 'header-title-container';

        // Title
        const titleSpan = document.createElement('span');
        titleSpan.className = 'header-title';
        titleSpan.textContent = column.title;
        titleContainer.appendChild(titleSpan);
        // Separator
        const sepSpan = document.createElement('span');
        sepSpan.className = 'header-separator';
        titleContainer.appendChild(sepSpan);

        // Sort indicator icon (if sortable)
        if (column.sorter) {
          const sortIcon = document.createElement('span');
          sortIcon.className = 'sort-indicator';
          sortIcon.addEventListener('click', () => this.sort(column.field, column.sortFunc));
          //sortIcon.style.cursor = 'pointer';

          // Show icon based on current sort state
          if (this.sortField === column.field) {
            sortIcon.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
          } else {
            sortIcon.textContent = '↕';
          }

          titleContainer.appendChild(sortIcon);
        }

        // Hide icon (if isHidable is true)
        if (column.isHidable) {
          const hideIcon = document.createElement('span');
          hideIcon.className = 'hide-column-icon';
          hideIcon.title = 'Hide this column';
          hideIcon.textContent = '⊘';
          hideIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideColumn(column);
          });
          titleContainer.appendChild(hideIcon);
        }

        headerContent.appendChild(titleContainer);


        // Filter
        if (column.headerFilter) {
          const filterDiv = document.createElement('div');
          filterDiv.className = 'header-filter';

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

            select.addEventListener('change', (e) => {
              this.setFilter(column.field, e.target.value, column.headerFilterFunc, column.headerFilterNormalize);
            });
            filterDiv.appendChild(select);
          } else if (column.headerFilter === true) {
            // Check if column has multiple filter inputs
           if (column.headerFilterInputs) {
             for (const inputConfig of column.headerFilterInputs) {
               this.createHeaderFilterInput(inputConfig, column, filterDiv);
             }
            } else {
              // Single input field
              const wrapper = document.createElement('div');
              wrapper.className = 'filter-input-wrapper';

              const input = document.createElement('input');
              input.type = 'text';
              input.placeholder = 'Filter...';
              input.dataset.field = column.field;
              input.className = 'filter-input';

              const clearBtn = document.createElement('button');
              clearBtn.className = 'filter-clear-btn';
              clearBtn.textContent = '×';
              clearBtn.type = 'button';
              clearBtn.title = 'Clear filter';

              this.createFilterInput(wrapper, input, clearBtn, column.field, column.headerFilterFunc, column.headerFilterNormalize);

              wrapper.appendChild(input);
              wrapper.appendChild(clearBtn);
              filterDiv.appendChild(wrapper);
            }
          }

          headerContent.appendChild(filterDiv);
        }

        th.appendChild(headerContent);
        headerRow.appendChild(th);
      }

      this.thead.appendChild(headerRow);
    }
    this.table.appendChild(this.thead);
  }

  // Extracted helper for filter inputs
  createFilterInput(wrapper, input, clearBtn, field, filterFunc, normalizeFunc) {
    const updateFilter = () => {
      const filterValues = {};
      const inputs = wrapper.closest('.header-filter').querySelectorAll('input[data-field="' + field + '"]');
      inputs.forEach(inp => {
        const key = inp.dataset.filterKey || 'value';
        filterValues[key] = inp.value;
      });
      const hasContent = Object.values(filterValues).some(v => v !== '');
      wrapper.classList.toggle('has-content', hasContent);
      const filterValue = inputs.length > 1 ? filterValues : input.value;
      this.debounce(() => this.setFilter(field, filterValue, filterFunc, normalizeFunc), 300);
    };
    input.addEventListener('input', updateFilter);
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      input.value = '';
      updateFilter();
    });
  }

  createHeaderFilterInput(inputConfig, column, filterDiv) {
    const wrapper = document.createElement('div');
    wrapper.className = 'filter-input-wrapper';
    const isDropdown = inputConfig.values && Array.isArray(inputConfig.values);
    
    let control;
    if (isDropdown) {
      // Create dropdown
      control = document.createElement('select');
      control.className = 'filter-select';
      control.dataset.field = column.field;
      control.dataset.filterKey = inputConfig.key;
      
      const allOption = document.createElement('option');
      allOption.value = '';
      allOption.textContent = inputConfig.placeholder || 'All';
      control.appendChild(allOption);
      
      for (const valueItem of inputConfig.values) {
        const option = document.createElement('option');
        const value = typeof valueItem === 'string' ? valueItem : (valueItem.value || valueItem);
        const display = typeof valueItem === 'string' ? valueItem : (valueItem.display || valueItem.value || valueItem);
        option.value = value;
        option.textContent = display;
        control.appendChild(option);
      }
      
      control.addEventListener('change', () => {
        this.setFilter(column.field, this.getFilterValues(column.field, filterDiv), column.headerFilterFunc, column.headerFilterNormalize);
      });
      wrapper.appendChild(control);
    } else {
      // Create text input
      control = document.createElement('input');
      control.type = 'text';
      control.placeholder = inputConfig.placeholder || 'Filter...';
      control.dataset.field = column.field;
      control.dataset.filterKey = inputConfig.key;
      control.className = 'filter-input';
      
      control.addEventListener('input', () => {
        const filterValues = this.getFilterValues(column.field, filterDiv);
        const hasContent = Object.values(filterValues).some(v => v !== '');
        wrapper.classList.toggle('has-content', hasContent);
        this.debounce(() => this.setFilter(column.field, filterValues, column.headerFilterFunc, column.headerFilterNormalize), 300);
      });
      
      const clearBtn = document.createElement('button');
      clearBtn.className = 'filter-clear-btn';
      clearBtn.textContent = '×';
      clearBtn.type = 'button';
      clearBtn.title = 'Clear filter';
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        control.value = '';
        this.setFilter(column.field, this.getFilterValues(column.field, filterDiv), column.headerFilterFunc, column.headerFilterNormalize);
      });
      
      wrapper.appendChild(control);
      wrapper.appendChild(clearBtn);
    }
    
    filterDiv.appendChild(wrapper);
  }

  getFilterValues(field, filterDivContext = null) {
    // Use provided filterDiv context or search for first header-filter
    const filterDiv = filterDivContext || this.table.querySelector(`.header-filter`);
    if (!filterDiv) return '';

    // Get all controls in filter for this field within this filterDiv
    const controls = filterDiv.querySelectorAll(`[data-field="${field}"]`);
    
    if (controls.length === 0) {
      return '';
    }

    if (controls.length === 1) {
      // Single control - return its value directly
      return controls[0].value;
    }

    // Multiple controls - return as object with filter keys
    const filterValues = {};
    controls.forEach(control => {
      const key = control.dataset.filterKey || 'value';
      filterValues[key] = control.value;
    });
    return filterValues;
  }

  getNestedValue(obj, field) {
    if (!field) return undefined;
    return field.split('.').reduce((acc, part) => acc?.[part], obj);
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
        /* objects are sorted as strings */
        if (valA && typeof valA !== "string") {
          valA = JSON.stringify(valA);
        }
        if (valB && typeof valB !== "string") {
          valB = JSON.stringify(valB);
        }
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        if (valA < valB) comparison = -1;
        else if (valA > valB) comparison = 1;
        else comparison = 0;
      }
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.renderBody();
    this.updateSortIndicators();
  }

  updateSortIndicators() {
    if (!this.thead) return;
    const ths = this.thead.querySelectorAll('th');
    for (let i = 0; i < this.columns.length; i++) {
      const column = this.columns[i];
      if (column.sorter) {
        const sortIcon = ths[i]?.querySelector('.sort-indicator');
        if (sortIcon) {
          if (this.sortField === column.field) {
            sortIcon.textContent = this.sortDirection === 'asc' ? '↑' : '↓';
          } else {
            sortIcon.textContent = '↕';
          }
        }
      }
    }
  }

  getFilter(field) {
    if (!field) {
      return this.filters;
    }
    return this.filters[field];
  }

  setFilter(field, value, filterFunc, normalizeFunc) {
    if (value === '' && !filterFunc && !normalizeFunc) {
      // Remove filter if empty value and no custom function
      delete this.filters[field];
    } else {
      this.filters[field] = {
        value,
        func: filterFunc,
        normalize: normalizeFunc ? normalizeFunc : (v => String(v || ''))
      };
    }
    this.applyFilters();
  }

  applyFilters() {
    this.filteredData = this.data.filter(row => {
      for (const [field, filter] of Object.entries(this.filters)) {
        const cellValue = this.getNestedValue(row, field);
        
        // Normalize filter values for comparison, but don't mutate the original
        let normalizedFilterValue = filter.value;
        if (typeof filter.value === 'string') {
          normalizedFilterValue = filter.normalize(filter.value);
        } else if (typeof filter.value === 'object') {
          normalizedFilterValue = {};
          for (const [key, value] of Object.entries(filter.value)) {
            normalizedFilterValue[key] = filter.normalize(value);
          }
        }

        if (filter.func) {
          // Custom filter function - pass the normalized filter value and the cell value
          if (!filter.func(normalizedFilterValue, cellValue)) {
            return false;
          }
        } else {
          // Default filtering
          let isEmpty = false;
          if (typeof normalizedFilterValue === 'string') {
            isEmpty = normalizedFilterValue === '';
          } else if (typeof normalizedFilterValue === 'object') {
            isEmpty = Object.values(normalizedFilterValue).every(v => v === '');
          }
          if (isEmpty) {
            continue; // No filter
          }

          let searchTerms = [];
          if (typeof normalizedFilterValue === 'string') {
            searchTerms = [normalizedFilterValue];
          } else if (typeof normalizedFilterValue === 'object') {
            searchTerms = Object.values(normalizedFilterValue).filter(v => v !== '');
          }

          if (Array.isArray(cellValue)) {
            if (!cellValue.some(v => searchTerms.some(term => filter.normalize(v).includes(term)))) {
              return false;
            }
          } else {
            if (!searchTerms.some(term => filter.normalize(cellValue).includes(term))) {
              return false;
            }
          }
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
    if (col) {
      col.visible = false;
      // Toggle classes instead of re-rendering
      const index = this.columns.indexOf(col);
      if (index !== -1) {
        const ths = this.table.querySelectorAll('th');
        const tds = this.table.querySelectorAll('td:nth-child(' + (index + 1) + ')');
        ths[index]?.classList.add('hidden');
        tds.forEach(td => td.classList.add('hidden'));
      }
    }
  }

  showColumn(column) {
    const col = typeof column === 'object' ? column : this.columns[column];
    if (col) {
      col.visible = true;
      // Toggle classes instead of re-rendering
      const index = this.columns.indexOf(col);
      if (index !== -1) {
        const ths = this.table.querySelectorAll('th');
        const tds = this.table.querySelectorAll('td:nth-child(' + (index + 1) + ')');
        ths[index]?.classList.remove('hidden');
        tds.forEach(td => td.classList.remove('hidden'));
      }
    }
  }

  renderBody() {
    const oldTbody = this.table.querySelector('tbody');
    if (oldTbody) oldTbody.remove();
    const tbody = document.createElement('tbody');
    const fragment = document.createDocumentFragment(); // Batch DOM updates
    for (let i = 0; i < this.filteredData.length; i++) {
      const row = document.createElement('tr');
      row.className = i % 2 === 0 ? 'even' : 'odd';
      row.dataset.index = i;
      const rowData = this.filteredData[i];
      for (const column of this.columns) {
        const td = document.createElement('td');
        td.className = 'table-cell';
        td.classList.toggle('hidden', column.visible === false);
        const cellValue = this.getNestedValue(rowData, column.field);
        if (column.formatter) {
          const mockCell = { getValue: () => cellValue, getData: () => rowData, getElement: () => td, getFilter: () => this.getFilter(column.field) };
          td.innerHTML = column.formatter(mockCell); // Assume formatter returns safe HTML
        } else if (Array.isArray(cellValue)) {
          td.innerHTML = cellValue.join('<br>'); // Keep HTML for line breaks
        } else {
          td.textContent = cellValue || '';
        }
        if (column.cellClick) {
          td.style.cursor = 'pointer';
          const mockCell = { getValue: () => cellValue, getData: () => rowData };
          td.addEventListener('click', (e) => column.cellClick(e, mockCell));
        }
        row.appendChild(td);
      }
      fragment.appendChild(row);
    }
    tbody.appendChild(fragment);
    this.table.appendChild(tbody);
    this.restoreFilterValues();
    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  restoreFilterValues() {
    for (const [field, filter] of Object.entries(this.filters)) {
      const select = this.container.querySelector(`select[data-field="${field}"]:not([data-filter-key])`);
      if (select) {
        select.value = filter.value;
      }

      // Handle multiple input fields or selects
      if (typeof filter.value === 'object' && filter.value !== null) {
        // Multiple inputs/selects with filter keys
        for (const [key, value] of Object.entries(filter.value)) {
          // Restore text inputs
          const input = this.container.querySelector(`input[data-field="${field}"][data-filter-key="${key}"]`);
          if (input) {
            input.value = value || '';
            const wrapper = input.closest('.filter-input-wrapper');
            if (wrapper) {
              const hasContent = Object.values(filter.value).some(v => v !== '');
              wrapper.classList.toggle('has-content', hasContent);
            }
          }

          // Restore dropdown selects with filter keys
          const selectControl = this.container.querySelector(`select[data-field="${field}"][data-filter-key="${key}"]`);
          if (selectControl) {
            selectControl.value = value || '';
            const wrapper = selectControl.closest('.filter-input-wrapper');
            if (wrapper) {
              const hasContent = Object.values(filter.value).some(v => v !== '');
              wrapper.classList.toggle('has-content', hasContent);
            }
          }
        }
      } else {
        // Single input field (string value, no filter keys)
        const input = this.container.querySelector(`input[data-field="${field}"]`);
        if (input && !input.dataset.filterKey) {
          input.value = filter.value || '';
          const wrapper = input.closest('.filter-input-wrapper');
          if (wrapper) {
            wrapper.classList.toggle('has-content', filter.value !== '');
          }
        }

        // Restore single dropdown select (string value, with filter key)
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
  }

  static trimLower(str) {
    return str ? str.trim().toLowerCase() : '';
  }

  redraw() {
    this.render();
  }
}
