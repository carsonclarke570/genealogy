import type { Meta, StoryObj } from "@storybook/react";
import { Text } from "./Text";

const meta = {
  title: "Primitives/Text",
  component: Text,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 480 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    children:
      "Eleanor was the eldest of seven children and kept the family farm through two wars.",
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Muted: Story = { args: { tone: "muted" } };
export const Subtle: Story = { args: { tone: "subtle", children: "Source: parish register, 1842" } };

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Text size="lg">Large — lead paragraph</Text>
      <Text size="base">Base — standard body copy</Text>
      <Text size="sm" tone="muted">
        Small — captions and metadata
      </Text>
    </div>
  ),
};
