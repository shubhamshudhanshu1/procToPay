import React from "react";
import {
  LinearProgress,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";

const Progress = React.forwardRef(
  (
    {
      type = "linear",
      value = 0,
      variant = "determinate",
      size = 40,
      color = "primary",
      thickness = 3.6,
      showLabel = false,
      label,
      sx,
      ...props
    },
    ref
  ) => {
    const progressValue = Math.min(Math.max(value, 0), 100);

    const ProgressComponent = () => {
      if (type === "circular") {
        return (
          <CircularProgress
            variant={variant}
            value={progressValue}
            size={size}
            color={color}
            thickness={thickness}
            {...props}
          />
        );
      }

      return (
        <LinearProgress
          variant={variant}
          value={progressValue}
          color={color}
          {...props}
        />
      );
    };

    if (showLabel || label) {
      return (
        <Box
          ref={ref}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
            ...sx,
          }}
        >
          <ProgressComponent />
          <Typography variant="body2" color="text.secondary">
            {label || `${Math.round(progressValue)}%`}
          </Typography>
        </Box>
      );
    }

    return (
      <Box ref={ref} sx={sx}>
        <ProgressComponent />
      </Box>
    );
  }
);

Progress.displayName = "Progress";

export default Progress;
