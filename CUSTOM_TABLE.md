# CustomTable - Table Component Documentation

## Overview

`CustomTable` is a lightweight, feature-rich table component for displaying and filtering tabular data. It provides sorting, filtering (including dropdown filters), column visibility toggling, and custom formatting capabilities.

## Features

- **Sorting**: Click column headers to sort ascending/descending
- **Filtering**: Text inputs, dropdown selects, checkboxes, and custom filter functions
- **Column Visibility**: Hide/show columns with the ⊘ icon
- **Custom Formatting**: Format cell content with custom functions
- **Cell Click Handlers**: Execute custom logic when cells are clicked
- **Responsive**: Optimized DOM updates and batching

## Installation

Include the script in your HTML:

```html
<script src="js/custom-table.js"></script>
```

## Basic Usage

```javascript
new CustomTable("#table-container", {
  data: [
    { id: 1, name: "Alice", status: "Active" },
    { id: 2, name: "Bob", status: "Inactive" }
  ],
  columns: [
    { title: "ID", field: "id", sorter: true },
    { title: "Name", field: "name", sorter: true, headerFilter: true },
    { title: "Status", field: "status" }
  ]
});
```

## Column Configuration

### Basic Properties

```javascript
{
  title: "Column Title",           // Display name
  field: "dataProperty",            // Property path in data (supports nested: "user.name")
  visible: true,                    // Show/hide column (default: true)
  sorter: false,                    // Enable sorting (default: false)
  isHidable: false,                 // Allow user to hide (default: false)
  headerFilter: false,              // Enable filtering (default: false)
  formatter: undefined,             // Custom cell formatter function
  sortFunc: undefined,              // Custom sort function
  cellClick: undefined              // Click handler function
}
```

### Advanced Properties

#### Sorting

```javascript
{
  field: "date",
  sorter: true,
  sortFunc: (valA, valB, rowA, rowB) => {
    // Custom sort logic
    // Return: negative if A < B, 0 if A == B, positive if A > B
    return new Date(valA) - new Date(valB);
  }
}
```

#### Formatting

```javascript
{
  field: "price",
  formatter: (cell) => {
    const value = cell.getValue();
    const data = cell.getData();
    const element = cell.getElement();
    
    // Return formatted HTML string
    return `$${parseFloat(value).toFixed(2)}`;
  }
}
```

#### Cell Click Handler

```javascript
{
  field: "action",
  cellClick: (event, cell) => {
    const value = cell.getValue();
    const rowData = cell.getData();
    console.log("Clicked:", value);
  }
}
```

## Filtering

### Simple Text Filter

```javascript
{
  field: "name",
  headerFilter: true,
  headerFilterNormalize: CustomTable.trimLower  // Optional normalize function
}
```

### Multiple Filter Inputs (Text + Dropdown)

```javascript
{
  field: "friendlyNames",
  headerFilter: true,
  headerFilterInputs: [
    {
      key: "lang",
      placeholder: "Language",
      values: ["en-US", "ko-KR", "ja-JP"]
    },
    {
      key: "name",
      placeholder: "Name"  // No values = text input
    }
  ],
  headerFilterFunc: (filterValue, rowValue) => {
    // filterValue = { lang: "en-US", name: "search text" }
    // filterValue properties match the keys in headerFilterInputs
    // Return true to show row, false to hide
    
    if (!filterValue.lang && !filterValue.name) return true;
    
    return Object.entries(rowValue).some(([lang, name]) => {
      return matchesFilter(lang, filterValue.lang) &&
             matchesFilter(name, filterValue.name);
    });
  },
  headerFilterNormalize: CustomTable.trimLower
}
```

### Dropdown Filter Formats

#### Simple String Values
```javascript
values: ["Option 1", "Option 2", "Option 3"]
```

#### Custom Display Text
```javascript
values: [
  { value: "active", display: "🟢 Active" },
  { value: "inactive", display: "🔴 Inactive" }
]
```

### Checkbox Filter

Use a checkbox in a column header to include only rows whose value passes the custom filter:

```javascript
{
  field: "icon",
  headerFilter: "checkbox",
  headerFilterParams: { ariaLabel: "Only show rows with an icon" },
  headerFilterFunc: (filterValue, rowValue) => {
    return filterValue !== "true" || Boolean(rowValue);
  }
}
```

Use `headerFilterParams.ariaLabel` to give the checkbox an accessible name without displaying a label in the header. Filters on different columns are combined with AND logic.

### Filter Behavior

- **Text inputs**: Debounced with 300ms delay, matches substring case-insensitively after normalization
- **Dropdowns**: Trigger immediately on selection and match exact value after normalization
- **Checkboxes**: Trigger immediately on change and pass the checked state to the column's custom filter function
- **Multiple filters**: All active filters for the same field are combined with AND logic; different fields are also AND-ed together
- **Empty filters**: Show all rows for that field when the value is empty or all sub-values are empty
- **Clear buttons**: Only appear on text inputs; dropdowns reset via the "All" option
- **Normalization**: `headerFilterNormalize` is applied to the filter value before comparison. If omitted, values are converted to strings.

## Events & Callbacks

### Update Callback

Called when table is updated (filtered, sorted):

```javascript
new CustomTable("#table", {
  data: myData,
  columns: myColumns,
  onUpdate: () => {
    console.log("Table updated");
    const count = document.querySelectorAll("#table tbody tr").length;
    console.log(`Showing ${count} rows`);
  }
});
```

## Methods

### `redraw()`
Force a complete table redraw:
```javascript
table.redraw();
```

### `getFilter(field)`
Get the current filter state for a field:
```javascript
const filter = table.getFilter("name");
console.log(filter);
// { value: "search", func: ..., normalize: ... }
```

### `clearFilters()`
Clear all active filters and reset the filter controls:
```javascript
table.clearFilters();
```

### `getColumns()`
Get column API objects:
```javascript
const columns = table.getColumns();
columns["Name"].hide();
columns["Name"].show();
```

### `sort(field, sortFunc)`
Programmatically sort a column:
```javascript
table.sort("name", (a, b) => a.localeCompare(b));
```

### `setFilter(field, value, filterFunc, normalizeFunc)`
Apply a filter programmatically for a field:
```javascript
table.setFilter("name", "alice", undefined, CustomTable.trimLower);
```

This is useful when you want to restore URL query parameters or drive filters from app state.

## Styling

### CSS Classes

```css
/* Main table */
.custom-table { }

/* Header cells */
.table-header { }
.header-title { }
.header-separator { }

/* Sort indicators */
.sort-indicator { }

/* Hide column button */
.hide-column-icon { }

/* Filters */
.header-filter { }
.filter-input-wrapper { }
.filter-input { }
.filter-select { }
.filter-checkbox-label { }
.filter-checkbox { }
.filter-clear-btn { }
.has-content { } /* Applied when filter has a value */

/* Body cells */
.table-cell { }
.even { }
.odd { }
.hidden { } /* Applied to hidden cells/headers */
```

### Custom Styling Example

```css
.custom-table {
  width: 100%;
  border-collapse: collapse;
  font-family: Arial, sans-serif;
}

.table-header {
  background-color: #f5f5f5;
  padding: 12px;
  text-align: left;
  border-bottom: 2px solid #ddd;
}

.filter-input,
.filter-select {
  width: 100%;
  padding: 6px;
  margin-top: 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.table-cell {
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
}

.odd {
  background-color: #fafafa;
}
```

## Utility Functions

### `CustomTable.trimLower(str)`

Normalize function that trims whitespace and converts to lowercase:

```javascript
const normalized = CustomTable.trimLower("  HELLO  ");
console.log(normalized); // "hello"
```

This is a convenient default for text-based filters when the column data may contain leading/trailing whitespace or mixed casing.

## Complete Example

```javascript
// Setup data
const data = [
  {
    aaguid: "12345678-1234-5678-1234-567812345678",
    friendlyNames: { "en-US": "Device 1", "ko-KR": "기기 1" },
    icon: "icon1.png"
  },
  {
    aaguid: "87654321-4321-8765-4321-876543210987",
    friendlyNames: { "en-US": "Device 2", "ja-JP": "デバイス 2" },
    icon: "icon2.png"
  }
];

// Create table with all features
new CustomTable("#devices-table", {
  data: data,
  columns: [
    {
      title: "AAGUID",
      field: "aaguid",
      headerFilter: true,
      headerFilterNormalize: CustomTable.trimLower,
      isHidable: true
    },
    {
      title: "Name",
      field: "friendlyNames",
      sorter: true,
      headerFilter: true,
      headerFilterInputs: [
        {
          key: "lang",
          placeholder: "Language",
          values: ["en-US", "ko-KR", "ja-JP"]
        },
        {
          key: "name",
          placeholder: "Name"
        }
      ],
      headerFilterNormalize: CustomTable.trimLower,
      formatter: (cell) => {
        const friendlyNames = cell.getValue();
        const filter = cell.getFilter("friendlyNames");
        
        return Object.entries(friendlyNames)
          .map(([lang, name]) => {
            const matchesLang = !filter?.value.lang || 
                               lang.toLowerCase().includes(filter.value.lang.toLowerCase());
            const matchesName = !filter?.value.name || 
                               name.toLowerCase().includes(filter.value.name.toLowerCase());
            
            if (matchesLang && matchesName) {
              return `<div class="friendly-name">${name}</div>`;
            }
            return "";
          })
          .join("");
      },
      headerFilterFunc: (filterValue, rowValue) => {
        if (!rowValue || Object.keys(rowValue).length === 0) return true;
        if (!filterValue.lang && !filterValue.name) return true;
        
        return Object.entries(rowValue).some(([lang, name]) => {
          return matchesFilter(lang, filterValue.lang) &&
                 matchesFilter(name, filterValue.name);
        });
      }
    },
    {
      title: "Icon",
      field: "icon",
      formatter: (cell) => `<img src="${cell.getValue()}" alt="icon">`,
      isHidable: true
    }
  ],
  onUpdate: () => {
    const count = document.querySelectorAll("#devices-table tbody tr").length;
    document.getElementById("table-size").textContent = count;
  }
});
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Requires ES6+ support (arrow functions, template literals, etc.)

## Performance Considerations

- **Large datasets**: Use pagination or virtual scrolling for 10,000+ rows
- **Complex filters**: Debouncing on text inputs prevents excessive re-renders
- **DOM batching**: Uses DocumentFragment for efficient batch DOM updates
- **CSS optimization**: Use `will-change` for frequently updated elements

## Troubleshooting

### Filter not working
- Ensure `headerFilterFunc` returns a boolean
- Check that the filter value matches the data format expected by the column
- Verify `headerFilterNormalize` is consistent with the data you are comparing
- For multi-field filters, confirm that all active sub-filters are intentionally set and not left as empty strings

### Dropdown values not displaying
- Ensure values are strings or have `value`/`display` properties
- Check for browser console errors in DevTools

### Performance issues
- Reduce data size with pagination
- Simplify formatter functions
- Avoid expensive work in custom filter logic when rendering each row

## License

Part of fido-mds-explorer project
