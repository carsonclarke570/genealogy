import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./Textarea";

const meta = {
  title: "Primitives/Textarea",
  component: Textarea,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 420 }}>
        <Story />
      </div>
    ),
  ],
  args: { placeholder: "Born in Yorkshire, emigrated in 1871…" },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: {
    rows: 5,
    defaultValue:
      "Eleanor was the eldest of seven children. She kept the family farm through two wars and was known for her detailed letters, many of which survive in this archive.",
  },
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: "" , placeholder: "Notes are required"},
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Record locked for editing." },
};
