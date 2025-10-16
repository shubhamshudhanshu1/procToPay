import React from "react";
import { Divider as MuiDivider } from "@mui/material";

const Divider = React.forwardRef(
  (
    {
      orientation = "horizontal",
      variant = "fullWidth",
      flexItem = false,
      light = false,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiDivider
        ref={ref}
        orientation={orientation}
        variant={variant}
        flexItem={flexItem}
        light={light}
        sx={sx}
        {...props}
      />
    );
  }
);

Divider.displayName = "Divider";

export default Divider;
