import { PageHeader } from '@/components/portal/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function TeamPage() {
  return (
    <div>
      <PageHeader
        title="Team"
        description="Manage your organization's team members"
      >
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>People in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Team management coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
