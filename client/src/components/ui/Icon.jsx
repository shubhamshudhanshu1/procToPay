import React from "react";
import { IconButton } from "@mui/material";

const Icon = React.forwardRef(
  (
    {
      children,
      onClick,
      color = "inherit",
      size = "medium",
      disabled = false,
      edge = false,
      sx,
      ...props
    },
    ref
  ) => {
    if (onClick) {
      return (
        <IconButton
          ref={ref}
          onClick={onClick}
          color={color}
          size={size}
          disabled={disabled}
          edge={edge}
          sx={sx}
          {...props}
        >
          {children}
        </IconButton>
      );
    }

    return (
      <span
        ref={ref}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          ...sx,
        }}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Icon.displayName = "Icon";

export default Icon;
