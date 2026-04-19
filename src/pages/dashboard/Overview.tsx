import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, CreditCard, DollarSign, Clock, Eye } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function Overview() {
  const userBalance = 12450.75;
  
  const recentTransactions = [
    { id: 1, type: "in", name: "Deposit", amount: 5000, date: "Today, 2:45 PM", status: "completed" },
    { id: 2, type: "out", name: "Transfer to Sarah Wilson", amount: 250.50, date: "Yesterday", status: "completed" },
    { id: 3, type: "in", name: "Interest Payment", amount: 12.75, date: "2 days ago", status: "completed" },
    { id: 4, type: "out", name: "Card Purchase - Amazon", amount: 89.99, date: "3 days ago", status: "completed" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Good morning</h2>
        <p className="text-muted-foreground">Welcome back to your AgriBank account</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 bg-gradient-to-br from-green-600 to-emerald-700 text-white border-0">
          <CardHeader>
            <CardTitle className="text-white opacity-90">Available Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-6">${userBalance.toLocaleString()}</div>
            <div className="flex gap-2">
              <Button className="bg-white text-green-700 hover:bg-gray-100">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Send Money
              </Button>
              <Button variant="secondary" className="bg-green-500 hover:bg-green-400 text-white">
                <ArrowDownLeft className="mr-2 h-4 w-4" />
                Receive
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Card Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CreditCard className="h-8 w-8 text-green-600" />
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <p className="text-2xl font-bold">**** **** **** 4582</p>
              <p className="text-xs text-muted-foreground">Expires 12/28</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your account activity for the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between border-b py-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${tx.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                    {tx.type === 'in' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium">{tx.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {tx.date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.type === 'in' ? 'text-green-600' : ''}`}>
                    {tx.type === 'in' ? '+' : '-'}${tx.amount.toLocaleString()}
                  </p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="w-full mt-6">
            <Eye className="mr-2 h-4 w-4" />
            View All Transactions
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$24,890.00</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,439.25</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">$0.00</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}