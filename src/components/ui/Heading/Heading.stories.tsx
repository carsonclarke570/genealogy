import type { Meta, StoryObj } from "@storybook/react";
import { Heading } from "./Heading";

const meta = {
  title: "Primitives/Heading",
  component: Heading,
  parameters: { layout: "padded" },
  args: { children: "The Whitfield Family" },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Level1: Story = { args: { level: 1 } };
export const Level2: Story = { args: { level: 2 } };
export const Level3: Story = { args: { level: 3 } };
export const Level4: Story = { args: { level: 4 } };

export const Scale: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Heading level={1}>Family archive</Heading>
      <Heading level={2}>Eleanor Whitfield</Heading>
      <Heading level={3}>Documents</Heading>
      <Heading level={4}>Birth certificate</Heading>
    </div>
  ),
};
