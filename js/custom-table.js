'use strict';

/**
 * CustomTable - A simple table implementation to replace Tabulator
 * Features: sorting, filtering, column visibility toggle
 * No fancy features: no drag/drop reordering, no column resize
 */

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

    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = '';

    // Create table element
    const table = document.createElement('table');
    table.className = 'custom-table';

    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    for (const column of this.columns) {
      const th = document.createElement('th');
      th.className = 'table-header';
      if (column.visible === false) {
        th.style.display = 'none';
      }

      const headerContent = document.createElement('div');
      headerContent.className = 'header-content';

      // Title
      const titleSpan = document.createElement('span');
      titleSpan.className = 'header-title';
      titleSpan.textContent = column.title;
      if (column.sorter) {
        titleSpan.style.cursor = 'pointer';
        titleSpan.addEventListener('click', () => this.sort(column.field));
      }
      headerContent.appendChild(titleSpan);

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
            if (column.headerFilterFunc) {
              this.setFilter(column.field, e.target.value, column.headerFilterFunc);
            } else {
              this.setFilter(column.field, e.target.value);
            }
          });
          filterDiv.appendChild(select);
        } else if (column.headerFilter === true) {
          // Check if column has multiple filter inputs
          if (column.headerFilterInputs) {
            // Create multiple input fields
            for (const inputConfig of column.headerFilterInputs) {
              const input = document.createElement('input');
              input.type = 'text';
              input.placeholder = inputConfig.placeholder || 'Filter...';
              input.dataset.field = column.field;
              input.dataset.filterKey = inputConfig.key;
              input.className = 'filter-input';

              input.addEventListener('input', (e) => {
                // Get all input values for this field
                const filterValues = {};
                const inputs = filterDiv.querySelectorAll('input[data-field="' + column.field + '"]');
                inputs.forEach(inp => {
                  const key = inp.dataset.filterKey || 'value';
                  filterValues[key] = inp.value;
                });

                if (column.headerFilterFunc) {
                  this.setFilter(column.field, filterValues, column.headerFilterFunc);
                } else {
                  this.setFilter(column.field, filterValues);
                }
              });
              filterDiv.appendChild(input);
            }
          } else {
            // Single input field
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Filter...';
            input.dataset.field = column.field;
            input.className = 'filter-input';

            input.addEventListener('input', (e) => {
              if (column.headerFilterFunc) {
                this.setFilter(column.field, e.target.value, column.headerFilterFunc);
              } else {
                this.setFilter(column.field, e.target.value);
              }
            });
            filterDiv.appendChild(input);
          }
        }

        headerContent.appendChild(filterDiv);
      }

      th.appendChild(headerContent);
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');

    for (let i = 0; i < this.filteredData.length; i++) {
      const row = document.createElement('tr');
      row.className = i % 2 === 0 ? 'even' : 'odd';
      row.dataset.index = i;

      const rowData = this.filteredData[i];

      for (const column of this.columns) {
        const td = document.createElement('td');
        td.className = 'table-cell';
        if (column.visible === false) {
          td.style.display = 'none';
        }

        const cellValue = this.getNestedValue(rowData, column.field);

        let cellContent = cellValue;
        if (column.formatter) {
          const mockCell = {
            getValue: () => cellValue,
            getData: () => rowData,
            getElement: () => td
          };
          cellContent = column.formatter(mockCell);
        } else if (Array.isArray(cellValue)) {
          cellContent = cellValue.join('<br>');
        }

        td.innerHTML = cellContent;

        if (column.cellClick) {
          td.style.cursor = 'pointer';
          const mockCell = {
            getValue: () => cellValue,
            getData: () => rowData
          };
          td.addEventListener('click', (e) => column.cellClick(e, mockCell));
        }

        row.appendChild(td);
      }

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    this.container.appendChild(table);

    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  getNestedValue(obj, field) {
    if (!field) return undefined;
    return field.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  sort(field) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.filteredData.sort((a, b) => {
      const valA = this.getNestedValue(a, field);
      const valB = this.getNestedValue(b, field);

      let comparison = 0;
      if (valA < valB) comparison = -1;
      else if (valA > valB) comparison = 1;

      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    this.render();
  }

  setFilter(field, value, filterFunc) {
    if (value === '' && !filterFunc) {
      // Remove filter if empty value and no custom filter function
      delete this.filters[field];
    } else {
      this.filters[field] = { value, func: filterFunc };
    }
    this.applyFilters();
  }

  applyFilters() {
    this.filteredData = this.data.filter(row => {
      for (const [field, filter] of Object.entries(this.filters)) {
        const cellValue = this.getNestedValue(row, field);

        if (filter.func) {
          // Custom filter function - pass the filter value and the cell value
          if (!filter.func(filter.value, cellValue)) {
            return false;
          }
        } else {
          // Default filter (case-insensitive)
          if (filter.value === '') {
            continue; // No filter
          }

          const lowerFilterValue = String(filter.value).toLowerCase();

          if (Array.isArray(cellValue)) {
            if (!cellValue.some(v => String(v).toLowerCase().includes(lowerFilterValue))) {
              return false;
            }
          } else {
            if (!String(cellValue || '').toLowerCase().includes(lowerFilterValue)) {
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
    return this.columns.map((col, index) => ({
      getDefinition: () => col,
      hide: () => this.hideColumn(col),
      show: () => this.showColumn(col),
      getField: () => col.field
    }));
  }

  hideColumn(column) {
    const col = typeof column === 'object' ? column : this.columns[column];
    if (col) {
      col.visible = false;
      this.render();
    }
  }

  showColumn(column) {
    const col = typeof column === 'object' ? column : this.columns[column];
    if (col) {
      col.visible = true;
      this.render();
    }
  }

  renderBody() {
    const table = this.container.querySelector('table');
    if (!table) return;

    // Remove old tbody
    const oldTbody = table.querySelector('tbody');
    if (oldTbody) {
      oldTbody.remove();
    }

    // Create new tbody
    const tbody = document.createElement('tbody');

    for (let i = 0; i < this.filteredData.length; i++) {
      const row = document.createElement('tr');
      row.className = i % 2 === 0 ? 'even' : 'odd';
      row.dataset.index = i;

      const rowData = this.filteredData[i];

      for (const column of this.columns) {
        const td = document.createElement('td');
        td.className = 'table-cell';
        if (column.visible === false) {
          td.style.display = 'none';
        }

        const cellValue = this.getNestedValue(rowData, column.field);

        let cellContent = cellValue;
        if (column.formatter) {
          const mockCell = {
            getValue: () => cellValue,
            getData: () => rowData,
            getElement: () => td
          };
          cellContent = column.formatter(mockCell);
        } else if (Array.isArray(cellValue)) {
          cellContent = cellValue.join('<br>');
        }

        td.innerHTML = cellContent;

        if (column.cellClick) {
          td.style.cursor = 'pointer';
          const mockCell = {
            getValue: () => cellValue,
            getData: () => rowData
          };
          td.addEventListener('click', (e) => column.cellClick(e, mockCell));
        }

        row.appendChild(td);
      }

      tbody.appendChild(row);
    }

    table.appendChild(tbody);

    // Restore filter values after rendering body
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
          }
        }
      } else {
        // Single input field
        const input = this.container.querySelector(`input[data-field="${field}"]`);
        if (input && !input.dataset.filterKey) {
          input.value = filter.value || '';
        }
      }
    }
  }

  redraw(force) {
    this.render();
  }

  attachEventListeners() {
    // Event listeners are attached during render
  }
}
