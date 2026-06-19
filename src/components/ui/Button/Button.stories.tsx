import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  parameters: { layout: "centered" },
  args: { children: "View record" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { variant: "primary" },
};

export const Secondary: Story = {
  args: { variant: "secondary", children: "Cancel" },
};

export const Ghost: Story = {
  args: { variant: "ghost", children: "More" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "Delete person" },
};

export const Link: Story = {
  args: { variant: "link", children: "View family tree" },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Button {...args} leftIcon={<span aria-hidden>＋</span>}>
        Add person
      </Button>
      <Button {...args} variant="secondary" rightIcon={<span aria-hidden>→</span>}>
        Next
      </Button>
    </div>
  ),
};

export const Loading: Story = {
  args: { loading: true, children: "Saving…" },
};
