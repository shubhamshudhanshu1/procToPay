import React from "react";
import { Grid as MuiGrid } from "@mui/material";

const Grid = React.forwardRef(
  (
    {
      children,
      container = false,
      item = false,
      xs,
      sm,
      md,
      lg,
      xl,
      spacing,
      direction,
      justifyContent,
      alignItems,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiGrid
        ref={ref}
        container={container}
        item={item}
        xs={xs}
        sm={sm}
        md={md}
        lg={lg}
        xl={xl}
        spacing={spacing}
        direction={direction}
        justifyContent={justifyContent}
        alignItems={alignItems}
        sx={sx}
        {...props}
      >
        {children}
      </MuiGrid>
    );
  }
);

Grid.displayName = "Grid";

export default Grid;
