import React from "react";
import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Checkbox,
} from "@mui/material";

const Table = React.forwardRef(
  (
    {
      columns = [],
      data = [],
      pagination = false,
      page = 0,
      rowsPerPage = 10,
      onPageChange,
      onRowsPerPageChange,
      selectable = false,
      selectedRows = [],
      onSelectionChange,
      sx,
      ...props
    },
    ref
  ) => {
    const handleSelectAllClick = (event) => {
      if (event.target.checked) {
        const newSelected = data.map((row, index) => index);
        onSelectionChange?.(newSelected);
      } else {
        onSelectionChange?.([]);
      }
    };

    const handleRowClick = (index) => {
      if (!selectable) return;

      const selectedIndex = selectedRows.indexOf(index);
      let newSelected = [];

      if (selectedIndex === -1) {
        newSelected = newSelected.concat(selectedRows, index);
      } else if (selectedIndex === 0) {
        newSelected = newSelected.concat(selectedRows.slice(1));
      } else if (selectedIndex === selectedRows.length - 1) {
        newSelected = newSelected.concat(selectedRows.slice(0, -1));
      } else if (selectedIndex > 0) {
        newSelected = newSelected.concat(
          selectedRows.slice(0, selectedIndex),
          selectedRows.slice(selectedIndex + 1)
        );
      }

      onSelectionChange?.(newSelected);
    };

    const isSelected = (index) => selectedRows.indexOf(index) !== -1;

    return (
      <Paper sx={{ width: "100%", overflow: "hidden", ...sx }}>
        <TableContainer>
          <MuiTable ref={ref} {...props}>
            <TableHead>
              <TableRow>
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        selectedRows.length > 0 &&
                        selectedRows.length < data.length
                      }
                      checked={
                        data.length > 0 && selectedRows.length === data.length
                      }
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align || "left"}>
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, index) => {
                const isItemSelected = isSelected(index);
                return (
                  <TableRow
                    key={index}
                    hover
                    selected={isItemSelected}
                    onClick={() => handleRowClick(index)}
                    sx={{ cursor: selectable ? "pointer" : "default" }}
                  >
                    {selectable && (
                      <TableCell padding="checkbox">
                        <Checkbox checked={isItemSelected} />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.id} align={column.align || "left"}>
                        {column.render
                          ? column.render(row[column.id], row, index)
                          : row[column.id]}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </MuiTable>
        </TableContainer>
        {pagination && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={data.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
          />
        )}
      </Paper>
    );
  }
);

Table.displayName = "Table";

export default Table;
