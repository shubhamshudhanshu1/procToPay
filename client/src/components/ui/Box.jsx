import React from "react";
import { Box as MuiBox } from "@mui/material";

const Box = React.forwardRef(
  ({ children, component = "div", sx, ...props }, ref) => {
    return (
      <MuiBox ref={ref} component={component} sx={sx} {...props}>
        {children}
      </MuiBox>
    );
  }
);

Box.displayName = "Box";

export default Box;
