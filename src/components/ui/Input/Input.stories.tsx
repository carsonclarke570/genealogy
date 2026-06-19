import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./Input";

const meta = {
  title: "Primitives/Input",
  component: Input,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: { placeholder: "Eleanor Whitfield" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: { defaultValue: "Eleanor Whitfield" },
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: "1840-13-02" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "Locked record" },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Input {...args} inputSize="sm" placeholder="Small" />
      <Input {...args} inputSize="md" placeholder="Medium" />
      <Input {...args} inputSize="lg" placeholder="Large" />
    </div>
  ),
};
