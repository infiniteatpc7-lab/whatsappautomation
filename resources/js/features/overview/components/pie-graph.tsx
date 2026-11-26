'use client';

import { LabelList, Pie, PieChart } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';

const chartData = [
  { browser: 'chrome', visitors: 275, fill: 'var(--color-chrome)' },
  { browser: 'safari', visitors: 200, fill: 'var(--color-safari)' },
  { browser: 'firefox', visitors: 187, fill: 'var(--color-firefox)' },
  { browser: 'edge', visitors: 173, fill: 'var(--color-edge)' },
  { browser: 'other', visitors: 90, fill: 'var(--color-other)' }
];

const chartConfig = {
  visitors: {
    label: 'Messages'
  },
  delivered: {
    label: 'Delivered',
    color: 'var(--chart-1)'
  },
  read: {
    label: 'Seen',
    color: 'var(--chart-2)'
  },
  sent: {
    label: 'Sent',
    color: 'var(--chart-3)'
  },
  failed: {
    label: 'Failed',
    color: 'var(--chart-4)'
  }
} satisfies ChartConfig;

interface PieGraphProps {
  data?: Array<{ browser: string; visitors: number; fill: string }>;
  title?: string;
  description?: string;
  badgeText?: string;
}

export function PieGraph({
  data = chartData,
  title = 'Message Status (30d)',
  description = 'Delivery & read breakdown',
  badgeText,
}: PieGraphProps) {
  const nonZero = data.filter((d) => d.visitors > 0);
  const displayData = nonZero.length > 0 ? nonZero : [{ browser: 'sent', visitors: 0, fill: 'var(--chart-3)' }];

  return (
    <Card className='flex h-full flex-col'>
      <CardHeader className='items-center pb-0'>
        <CardTitle>
          {title}
          {badgeText && (
            <Badge variant='outline'>
              <Icons.trendingUp />
              {badgeText}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className='flex flex-1 items-center justify-center pb-0'>
        <ChartContainer
          config={chartConfig}
          className='[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[300px] min-h-[250px]'
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey='visitors' hideLabel />} />
            <Pie
              data={displayData}
              innerRadius={30}
              dataKey='visitors'
              radius={10}
              cornerRadius={8}
              paddingAngle={4}
            >
              <LabelList
                dataKey='visitors'
                stroke='none'
                fontSize={12}
                fontWeight={500}
                fill='currentColor'
                formatter={(value) => String(value ?? '')}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
