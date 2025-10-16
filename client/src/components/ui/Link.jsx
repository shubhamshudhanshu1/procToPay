import React from "react";
import { Link as MuiLink } from "@mui/material";

const Link = React.forwardRef(
  (
    {
      children,
      href,
      target,
      rel,
      underline = "hover",
      color = "primary",
      variant = "inherit",
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiLink
        ref={ref}
        href={href}
        target={target}
        rel={rel}
        underline={underline}
        color={color}
        variant={variant}
        sx={sx}
        {...props}
      >
        {children}
      </MuiLink>
    );
  }
);

Link.displayName = "Link";

export default Link;
