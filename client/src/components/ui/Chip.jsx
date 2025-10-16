import React from "react";
import { Chip as MuiChip } from "@mui/material";

const Chip = React.forwardRef(
  (
    {
      label,
      variant = "filled",
      color = "default",
      size = "medium",
      avatar,
      icon,
      onDelete,
      deleteIcon,
      clickable = false,
      disabled = false,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiChip
        ref={ref}
        label={label}
        variant={variant}
        color={color}
        size={size}
        avatar={avatar}
        icon={icon}
        onDelete={onDelete}
        deleteIcon={deleteIcon}
        clickable={clickable}
        disabled={disabled}
        sx={sx}
        {...props}
      />
    );
  }
);

Chip.displayName = "Chip";

export default Chip;
