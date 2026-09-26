import { FeedbackState } from "./FeedbackState";

export type SelectionRequiredStateProps = {
  message: string;
  title: string;
};

/** Explains that a program or activity must be selected before work can continue. */
export function SelectionRequiredState({ message, title }: SelectionRequiredStateProps) {
  return <FeedbackState description={message} title={title} titleSize="lg" />;
}
