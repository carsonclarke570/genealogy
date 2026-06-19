import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
} from "./Card";
import { Button } from "../Button/Button";
import { Badge } from "../Badge/Badge";

const meta = {
  title: "Primitives/Card",
  component: Card,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 380 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Eleanor Whitfield</CardTitle>
        <CardDescription>1842–1919 · Yorkshire, England</CardDescription>
      </CardHeader>
      <CardBody>
        <p className="text-sm text-ink-muted">
          Eldest of seven children; kept the family farm through two wars.
        </p>
      </CardBody>
      <CardFooter>
        <Button size="sm">Open record</Button>
        <Button size="sm" variant="ghost">
          View in tree
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const Interactive: Story = {
  render: () => (
    <Card interactive>
      <CardBody className="flex items-center justify-between">
        <div>
          <p className="font-serif text-base font-semibold text-ink">
            Whitfield family
          </p>
          <p className="text-sm text-ink-muted">128 people · 4 generations</p>
        </div>
        <Badge variant="primary">Tree</Badge>
      </CardBody>
    </Card>
  ),
};

export const Plain: Story = {
  render: () => (
    <Card>
      <CardBody>
        <p className="text-sm text-ink">
          A bare card with only a body — useful for simple panels.
        </p>
      </CardBody>
    </Card>
  ),
};
