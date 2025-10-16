import React from "react";
import { Typography as MuiTypography } from "@mui/material";

const Typography = React.forwardRef(
  (
    {
      children,
      variant = "body1",
      component,
      color,
      align,
      gutterBottom = false,
      noWrap = false,
      paragraph = false,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiTypography
        ref={ref}
        variant={variant}
        component={component}
        color={color}
        align={align}
        gutterBottom={gutterBottom}
        noWrap={noWrap}
        paragraph={paragraph}
        sx={sx}
        {...props}
      >
        {children}
      </MuiTypography>
    );
  }
);

Typography.displayName = "Typography";

export default Typography;
