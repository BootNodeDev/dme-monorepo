import "./Button.css";

export type MyButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
};

export function Button({ children, onClick }: MyButtonProps) {
  return (
    <button className="button" onClick={onClick}>
      {children}
    </button>
  );
}
