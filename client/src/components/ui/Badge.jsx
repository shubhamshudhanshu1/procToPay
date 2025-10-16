import React from "react";
import { Badge as MuiBadge } from "@mui/material";

const Badge = React.forwardRef(
  (
    {
      children,
      badgeContent,
      color = "default",
      variant = "standard",
      max = 99,
      showZero = false,
      invisible = false,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiBadge
        ref={ref}
        badgeContent={badgeContent}
        color={color}
        variant={variant}
        max={max}
        showZero={showZero}
        invisible={invisible}
        sx={sx}
        {...props}
      >
        {children}
      </MuiBadge>
    );
  }
);

Badge.displayName = "Badge";

export default Badge;
