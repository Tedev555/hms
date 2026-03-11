export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to the Hospital Management System. Select a module from the sidebar to get started.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Patients", value: "—", description: "Registered patients" },
          { title: "Appointments Today", value: "—", description: "Scheduled for today" },
          { title: "Bed Occupancy", value: "—", description: "Current occupancy rate" },
          { title: "Pending Lab Results", value: "—", description: "Awaiting processing" },
        ].map((card) => (
          <div key={card.title} className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
