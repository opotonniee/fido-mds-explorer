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
              // Create multiple input fields
              for (const inputConfig of column.headerFilterInputs) {
                const wrapper = document.createElement('div');
                wrapper.className = 'filter-input-wrapper';

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

                this.createFilterInput(wrapper, input, clearBtn, column.field, column.headerFilterFunc, column.headerFilterNormalize);

                wrapper.appendChild(input);
                wrapper.appendChild(clearBtn);
                filterDiv.appendChild(wrapper);
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
        if (typeof filter.value === 'string') {
          filter.value = filter.normalize(filter.value);
        } else if (typeof filter.value === 'object') {
          for (const [key, value] of Object.entries(filter.value)) {
            filter.value[key] = filter.normalize(value);
          }
        }

        if (filter.func) {
          // Custom filter function - pass the filter value and the cell value
          if (!filter.func(filter.value, cellValue)) {
            return false;
          }
        } else {
          // Default filtering
          let isEmpty = false;
          if (typeof filter.value === 'string') {
            isEmpty = filter.value === '';
          } else if (typeof filter.value === 'object') {
            isEmpty = Object.values(filter.value).every(v => v === '');
          }
          if (isEmpty) {
            continue; // No filter
          }

          let searchTerms = [];
          if (typeof filter.value === 'string') {
            searchTerms = [filter.value];
          } else if (typeof filter.value === 'object') {
            searchTerms = Object.values(filter.value).filter(v => v !== '');
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
      const select = this.container.querySelector(`select[data-field="${field}"]`);
      if (select) {
        select.value = filter.value;
      }

      // Handle multiple input fields
      if (typeof filter.value === 'object' && filter.value !== null) {
        // Multiple inputs with filter keys
        for (const [key, value] of Object.entries(filter.value)) {
          const input = this.container.querySelector(`input[data-field="${field}"][data-filter-key="${key}"]`);
          if (input) {
            input.value = value || '';
            const wrapper = input.closest('.filter-input-wrapper');
            if (wrapper) {
              const hasContent = Object.values(filter.value).some(v => v !== '');
              wrapper.classList.toggle('has-content', hasContent);
            }
          }
        }
      } else {
        // Single input field
        const input = this.container.querySelector(`input[data-field="${field}"]`);
        if (input && !input.dataset.filterKey) {
          input.value = filter.value || '';
          const wrapper = input.closest('.filter-input-wrapper');
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
