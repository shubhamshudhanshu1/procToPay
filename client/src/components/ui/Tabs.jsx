import React from "react";
import { Tabs as MuiTabs, Tab as MuiTab } from "@mui/material";

const Tabs = React.forwardRef(
  (
    {
      children,
      value,
      onChange,
      variant = "standard",
      scrollButtons = "auto",
      centered = false,
      orientation = "horizontal",
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiTabs
        ref={ref}
        value={value}
        onChange={onChange}
        variant={variant}
        scrollButtons={scrollButtons}
        centered={centered}
        orientation={orientation}
        sx={sx}
        {...props}
      >
        {children}
      </MuiTabs>
    );
  }
);

Tabs.displayName = "Tabs";

// Tab Component
export const Tab = React.forwardRef(
  (
    {
      label,
      value,
      disabled = false,
      icon,
      iconPosition = "top",
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiTab
        ref={ref}
        label={label}
        value={value}
        disabled={disabled}
        icon={icon}
        iconPosition={iconPosition}
        sx={sx}
        {...props}
      />
    );
  }
);

Tab.displayName = "Tab";

export default Tabs;
