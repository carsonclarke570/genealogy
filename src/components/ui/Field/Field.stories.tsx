import type { Meta, StoryObj } from "@storybook/react";
import { Field } from "./Field";
import { Input } from "../Input/Input";
import { Textarea } from "../Textarea/Textarea";

const meta = {
  title: "Primitives/Field",
  component: Field,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHint: Story = {
  args: {
    label: "Full name",
    htmlFor: "name",
    hint: "Include maiden names where known.",
    children: <Input id="name" placeholder="Eleanor Whitfield" />,
  },
};

export const Required: Story = {
  args: {
    label: "Birth date",
    htmlFor: "birth",
    required: true,
    hint: "Use YYYY-MM-DD; approximate dates are allowed.",
    children: <Input id="birth" placeholder="1842-06-19" />,
  },
};

export const WithError: Story = {
  args: {
    label: "Birth date",
    htmlFor: "birth-err",
    required: true,
    error: "Enter a valid date (YYYY-MM-DD).",
    children: <Input id="birth-err" invalid defaultValue="1842-13-40" />,
  },
};

export const WithTextarea: Story = {
  args: {
    label: "Biographical notes",
    htmlFor: "notes",
    hint: "Sources and anecdotes welcome.",
    children: (
      <Textarea id="notes" defaultValue="Eldest of seven; kept the farm…" />
    ),
  },
};
