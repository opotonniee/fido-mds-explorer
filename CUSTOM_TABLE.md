# CustomTable - Table Component Documentation

## Overview

`CustomTable` is a lightweight, feature-rich table component for displaying and filtering tabular data. It provides sorting, filtering (including dropdown filters), column visibility toggling, and custom formatting capabilities.

## Features

- **Sorting**: Click column headers to sort ascending/descending
- **Filtering**: Text inputs, dropdown selects, and custom filter functions
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

### Filter Behavior

- **Text inputs**: Debounced with 300ms delay, matches substring case-insensitively
- **Dropdowns**: Trigger immediately on selection, match exact value case-insensitively
- **Multiple filters**: All must match for row to display (AND logic)
- **Empty filters**: Show all rows
- **Clear buttons**: Only appear on text inputs; dropdowns reset via "All" option

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
Force complete table redraw:
```javascript
table.redraw();
```

### `getFilter(field)`
Get current filter for a field:
```javascript
const filter = table.getFilter("name");
console.log(filter); // { value: "search", func: ..., normalize: ... }
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
- Ensure `headerFilterFunc` returns boolean
- Check that filter value matches data format
- Verify `headerFilterNormalize` is consistent with data

### Dropdown values not displaying
- Ensure values are strings or have `value`/`display` properties
- Check for console errors in browser DevTools

### Performance issues
- Reduce data size with pagination
- Simplify formatter functions
- Use indexes for faster property access in nested objects

## License

Part of fido-mds-explorer project
