import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// أنواع البيانات
type DashboardStats = {
    totalLeaders: number;
    totalPersons: number;
    totalVotes: number;
    leadersDistribution?: { leaderId: number | null; leaderName: string; count: number }[];
  };

type AggregatesNormalized = {
    leader_name: string;
    cnt: number;
    sum_votes: number;
  };

type PersonPreview = {
    id: number;
    leader_name: string;
    full_name: string;
    residence: string;
    phone: string;
    workplace: string;
    center_info: string;
    station_number: string;
    votes_count: number;
  };

type LeaderWithPreview = {
    id: number;
    full_name: string;
    individualsPreview?: PersonPreview[];
  };

type LeadersResp = {
    aggregatesNormalized?: AggregatesNormalized[];
    leaders?: LeaderWithPreview[];
  };

const COLORS = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#6366F1',
    '#14B8A6', '#8B5CF6', '#F97316', '#22C55E', '#06B6D4',
  ];

function ChartTooltip({ active, payload }: any) {
    if (active && payload && payload.length) {
      const p = payload[0];
      const name = p?.name ?? '';
      const value = p?.value ?? 0;
      const percent = p?.payload?.__percent ?? 0;
      return (
        <div style={{ background: 'rgba(0,0,0,0.75)', color: '#fff', padding: 8, borderRadius: 6, fontSize: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{name}</div>
          <div>عدد الأفراد: {value}</div>
          <div>النسبة: {percent.toFixed(1)}%</div>
        </div>
      );
    }
    return null;
  }

// تسمية مخصصة (خارجيّة بخط مرجعي) تُعرض بمحاذاة كل شريحة
function InsideSliceLabel(props: any) {
    const {
      cx, cy, midAngle, innerRadius = 0, outerRadius = 0, percent, name,
    } = props;

    const p = Math.max(0, percent || 0);
    const RADIAN = Math.PI / 180;

    // نقطة على حافة الشريحة + إزاحة للخارج
    const anchorR = outerRadius + 12 + (p * 30); // كلما كبرت النسبة زادت الإزاحة قليلاً
    const anchorX = cx + anchorR * Math.cos(-midAngle * RADIAN);
    const anchorY = cy + anchorR * Math.sin(-midAngle * RADIAN);

    // نقطة على الحافة لاستخدامها كبداية للخط
    const edgeR = outerRadius - 2;
    const edgeX = cx + edgeR * Math.cos(-midAngle * RADIAN);
    const edgeY = cy + edgeR * Math.sin(-midAngle * RADIAN);

    // جهة المحاذاة يمين/يسار
    const isRight = Math.cos(-midAngle * RADIAN) >= 0;
    const textAnchor = isRight ? 'start' : 'end';

    // حدود الإظهار لتقليل التزاحم
    if (p < 0.03) return null; // شرائح ضئيلة جداً: لا نص

    // عرض الاسم كاملاً كما هو (بدون قصّ) كما يُستخدم عالمياً
    const displayName = typeof name === 'string' ? name : String(name ?? '');

    const pct100 = Math.round(p * 100);

    // مسافة صغيرة أفقية حسب الجهة
    const dx = isRight ? 12 : -12;

    return (
      <>
        {/* خط مرجعي من الحافة إلى نقطة التسمية */}
        <polyline
          points={`${edgeX},${edgeY} ${anchorX},${anchorY}`}
          stroke="rgba(255,255,255,0.9)"
          strokeWidth={1}
          fill="none"
        />
        <text
          x={anchorX + dx}
          y={anchorY}
          fill="#fff"
          textAnchor={textAnchor}
          dominantBaseline="central"
          style={{ pointerEvents: 'none' }}
        >
          <tspan fontSize={12} fontWeight={700}>{displayName}</tspan>
          <tspan x={anchorX + dx} dy="1.15em" fontSize={11} opacity={0.95} fontWeight={600}>
            {pct100}%
          </tspan>
        </text>
      </>
    );
  }

interface LeaderPieChartProps {
    data: { name: string; value: number; __percent?: number }[];
    onClick?: () => void;
  }

function LeaderPieChart({ data, onClick }: LeaderPieChartProps) {
    return (
      <div className="w-full h-[300px] md:h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.length ? data : [{ name: 'لايوجد', value: 1 }]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={160}
              label={<InsideSliceLabel />}
              labelLine={true}
              minAngle={10}
              onClick={onClick}
            >
              {(data.length ? data : [{ name: 'لايوجد', value: 1 }]).map((entry, i) => (
                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend verticalAlign="bottom" iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

export default LeaderPieChart;