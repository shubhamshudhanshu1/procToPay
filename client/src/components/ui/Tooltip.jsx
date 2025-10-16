import React from "react";
import { Tooltip as MuiTooltip } from "@mui/material";

const Tooltip = React.forwardRef(
  (
    {
      children,
      title,
      placement = "bottom",
      arrow = false,
      open,
      onClose,
      onOpen,
      disableFocusListener = false,
      disableHoverListener = false,
      disableTouchListener = false,
      enterDelay = 100,
      leaveDelay = 0,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiTooltip
        ref={ref}
        title={title}
        placement={placement}
        arrow={arrow}
        open={open}
        onClose={onClose}
        onOpen={onOpen}
        disableFocusListener={disableFocusListener}
        disableHoverListener={disableHoverListener}
        disableTouchListener={disableTouchListener}
        enterDelay={enterDelay}
        leaveDelay={leaveDelay}
        sx={sx}
        {...props}
      >
        {children}
      </MuiTooltip>
    );
  }
);

Tooltip.displayName = "Tooltip";

export default Tooltip;
