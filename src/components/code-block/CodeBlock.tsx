import { FC } from "react";

const CodeBlock: FC<{
  text?: string;
}> = (props) => {
  return (
    <div
      style={{
        whiteSpace: "pre",
        padding: "8px",
        backgroundColor: "black",
        color: "white",
        overflowX: "auto",
        overflowY: "auto",
        maxHeight: "520px",
        lineHeight: "200%",
      }}
    >
      {JSON.stringify(props.text, null, 4)}
    </div>
  );
};

export default CodeBlock;
