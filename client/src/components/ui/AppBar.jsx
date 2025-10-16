import React from "react";
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";

const AppBar = React.forwardRef(
  (
    {
      children,
      title,
      position = "static",
      color = "primary",
      elevation = 4,
      onMenuClick,
      menuIcon = true,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiAppBar
        ref={ref}
        position={position}
        color={color}
        elevation={elevation}
        sx={sx}
        {...props}
      >
        <Toolbar>
          {menuIcon && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={onMenuClick}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          {title && (
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {title}
            </Typography>
          )}
          <Box sx={{ flexGrow: 1 }} />
          {children}
        </Toolbar>
      </MuiAppBar>
    );
  }
);

AppBar.displayName = "AppBar";

export default AppBar;
