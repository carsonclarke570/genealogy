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

// A self-contained portrait (inline SVG data URI) so the image variant renders
// deterministically without any network dependency.
const portrait =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
      <rect width='160' height='160' fill='#3f5d4e'/>
      <circle cx='80' cy='62' r='34' fill='#e3ebe4'/>
      <path d='M24 160c0-34 25-56 56-56s56 22 56 56z' fill='#e3ebe4'/>
    </svg>`,
  );

export const WithImage: Story = {
  args: {
    src: portrait,
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
