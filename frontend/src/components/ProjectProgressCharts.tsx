import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts'

interface ProjectProgressChartsProps {
  timeSeries: any[]
  summary: any
  members: any[]
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444']

export default function ProjectProgressCharts({ timeSeries, summary, members }: ProjectProgressChartsProps) {
  const pieData = [
    { name: 'Chưa làm', value: summary.todoTasks },
    { name: 'Đang làm', value: summary.inProgressTasks },
    { name: 'Hoàn thành', value: summary.doneTasks },
    { name: 'Quá hạn', value: summary.overdueTasks },
  ].filter(item => item.value > 0)

  const barData = members.map((member: any) => ({
    name: member.fullName.split(' ').pop(),
    done: member.doneTasks,
    total: member.totalTasks,
  }))

  const lineData = timeSeries.slice(-14).map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    planned: item.plannedPercent,
    actual: item.actualPercent,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Pie Chart */}
      <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Phân bố task
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--bg1)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart */}
      <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Task hoàn thành theo thành viên
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" style={{ fill: 'var(--text2)', fontSize: 12 }} />
            <YAxis style={{ fill: 'var(--text2)', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg1)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="done" name="Hoàn thành" fill="#22c55e" />
            <Bar dataKey="total" name="Tổng" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart */}
      <div className="p-5 rounded-2xl border lg:col-span-2" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Tiến độ theo thời gian
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" style={{ fill: 'var(--text2)', fontSize: 12 }} />
            <YAxis style={{ fill: 'var(--text2)', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg1)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="planned" stroke="#6366f1" name="Kế hoạch" strokeWidth={2} />
            <Line type="monotone" dataKey="actual" stroke="#22c55e" name="Thực tế" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
