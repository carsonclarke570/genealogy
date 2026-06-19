import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./Avatar";

const meta = {
  title: "Primitives/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
  args: { name: "Eleanor Whitfield" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const WithImage: Story = {
  args: {
    src: "https://i.pravatar.cc/160?img=47",
    name: "Eleanor Whitfield",
    size: "lg",
  },
};

export const Square: Story = {
  args: { square: true, name: "Thomas Hale", size: "lg" },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Avatar {...args} size="sm" />
      <Avatar {...args} size="md" />
      <Avatar {...args} size="lg" />
      <Avatar {...args} size="xl" />
    </div>
  ),
};
