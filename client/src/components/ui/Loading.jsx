import React from "react";
import {
  CircularProgress,
  LinearProgress,
  Box,
  Typography,
} from "@mui/material";

const Loading = React.forwardRef(
  (
    {
      type = "circular",
      size = 40,
      color = "primary",
      message,
      overlay = false,
      sx,
      ...props
    },
    ref
  ) => {
    const LoadingComponent = () => {
      if (type === "linear") {
        return <LinearProgress color={color} {...props} />;
      }

      return <CircularProgress size={size} color={color} {...props} />;
    };

    if (overlay) {
      return (
        <Box
          ref={ref}
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
            ...sx,
          }}
        >
          <LoadingComponent />
          {message && (
            <Typography variant="body2" sx={{ mt: 2, color: "white" }}>
              {message}
            </Typography>
          )}
        </Box>
      );
    }

    return (
      <Box
        ref={ref}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          ...sx,
        }}
      >
        <LoadingComponent />
        {message && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {message}
          </Typography>
        )}
      </Box>
    );
  }
);

Loading.displayName = "Loading";

export default Loading;
