import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  args: { children: "Photo" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = { args: { variant: "neutral", children: "Other" } };
export const Primary: Story = { args: { variant: "primary", children: "Living" } };
export const Accent: Story = {
  args: { variant: "accent", children: "Certificate" },
};
export const Success: Story = {
  args: { variant: "success", children: "Verified" },
};
export const Warning: Story = {
  args: { variant: "warning", children: "Unsourced" },
};
export const Danger: Story = {
  args: { variant: "danger", children: "Conflict" },
};

export const DocumentTypes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="primary">Photo</Badge>
      <Badge variant="accent">Certificate</Badge>
      <Badge variant="neutral">Article</Badge>
      <Badge variant="warning">Obituary</Badge>
    </div>
  ),
};
