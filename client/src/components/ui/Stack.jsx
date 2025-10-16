import React from "react";
import { Stack as MuiStack } from "@mui/material";

const Stack = React.forwardRef(
  (
    {
      children,
      direction = "column",
      spacing = 1,
      justifyContent,
      alignItems,
      divider,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiStack
        ref={ref}
        direction={direction}
        spacing={spacing}
        justifyContent={justifyContent}
        alignItems={alignItems}
        divider={divider}
        sx={sx}
        {...props}
      >
        {children}
      </MuiStack>
    );
  }
);

Stack.displayName = "Stack";

export default Stack;
