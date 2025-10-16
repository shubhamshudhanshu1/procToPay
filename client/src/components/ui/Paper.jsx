import React from "react";
import { Paper as MuiPaper } from "@mui/material";

const Paper = React.forwardRef(
  (
    {
      children,
      elevation = 1,
      variant = "elevation",
      square = false,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiPaper
        ref={ref}
        elevation={elevation}
        variant={variant}
        square={square}
        sx={sx}
        {...props}
      >
        {children}
      </MuiPaper>
    );
  }
);

Paper.displayName = "Paper";

export default Paper;
