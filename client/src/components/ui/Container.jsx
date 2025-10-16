import React from "react";
import { Container as MuiContainer } from "@mui/material";

const Container = React.forwardRef(
  (
    {
      children,
      maxWidth = "lg",
      fixed = false,
      disableGutters = false,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiContainer
        ref={ref}
        maxWidth={maxWidth}
        fixed={fixed}
        disableGutters={disableGutters}
        sx={sx}
        {...props}
      >
        {children}
      </MuiContainer>
    );
  }
);

Container.displayName = "Container";

export default Container;
