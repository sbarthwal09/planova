import type { ComponentPropsWithoutRef } from "react";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
    variant?: "primary" | "secondary" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
};

const Button = ({
    variant = "primary",
    size = "md",
    fullWidth = false,
    className,
    children,
    ...props
}: ButtonProps) => {
    const classes = ["btn", `btn--${variant}`, `btn--${size}`, fullWidth && "btn--full", className]
        .filter(Boolean)
        .join(" ");

    return <button {...props} className={classes}>{children}</button>;
};

export default Button;