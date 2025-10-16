import React from "react";
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from "@mui/material";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";

const Breadcrumbs = React.forwardRef(
  (
    {
      items = [],
      separator = <NavigateNextIcon fontSize="small" />,
      maxItems = 8,
      sx,
      ...props
    },
    ref
  ) => {
    return (
      <MuiBreadcrumbs
        ref={ref}
        separator={separator}
        maxItems={maxItems}
        sx={sx}
        {...props}
      >
        {items.map((item, index) => {
          if (item.href) {
            return (
              <Link
                key={index}
                underline="hover"
                color="inherit"
                href={item.href}
                onClick={item.onClick}
              >
                {item.label}
              </Link>
            );
          }

          return (
            <Typography key={index} color="text.primary">
              {item.label}
            </Typography>
          );
        })}
      </MuiBreadcrumbs>
    );
  }
);

Breadcrumbs.displayName = "Breadcrumbs";

export default Breadcrumbs;
