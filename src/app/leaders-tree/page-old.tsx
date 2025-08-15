'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, User, ChevronDown, ChevronRight, Home, MapPin, Phone, 
  Building, Info, Calendar, TrendingUp, Eye, EyeOff 
} from 'lucide-react';

type TreeNode = {
  id: string;
  label: string;
  type: 'leader' | 'person';
  votes?: number;
  details?: {
    residence?: string;
    phone?: string;
    workplace?: string;
    center_info?: string;
    station_number?: string;
    created_at?: string;
    updated_at?: string;
  };
  children?: TreeNode[];
  totalVotes?: number;
};

export default function LeadersTreePage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = '/login';
  }, [loading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) fetchTree();
  }, [isAuthenticated]);

  const fetchTree = async () => {
    try {
      const res = await fetch('/api/leaders-tree', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTree(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching tree:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpansion = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDetails = (id: string) => {
    setShowDetails((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectNode = (id: string, node: TreeNode) => {
    setSelectedNodeId(id);
    // إذا كان القائد، افتح فروعه تلقائياً
    if (node.type === 'leader') {
      setExpanded((prev) => ({ ...prev, [id]: true }));
    }
    // اعرض التفاصيل
    setShowDetails((prev) => ({ ...prev, [id]: true }));
  };

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    
    // البحث في المستوى الأول (القادة)
    for (const leader of tree) {
      if (leader.id === selectedNodeId) return leader;
      
      // البحث في المستوى الثاني (الأفراد)
      if (leader.children) {
        for (const person of leader.children) {
          if (person.id === selectedNodeId) return person;
        }
      }
    }
    return null;
  }, [tree, selectedNodeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.15_0.02_280)] to-[oklch(0.05_0.01_280)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.15_0.02_280)] to-[oklch(0.05_0.01_280)] text-white">
      {/* Header */}
      <header className="bg-card/60 border-border backdrop-blur-xl border rounded-xl shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">ش ج</span>
              </div>
              <div className="mr-3">
                <h1 className="text-xl font-semibold text-foreground">العرض الشجري التفاعلي</h1>
                <p className="text-sm text-muted-foreground">اضغط على أي عنصر لعرض تفاصيله الكاملة</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="border-border bg-card/60 backdrop-blur-lg text-foreground hover:bg-card/80 rounded-xl"
              >
                <Home className="h-4 w-4 mr-2" />
                الرئيسية
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tree View */}
          <Card className="lg:col-span-2 bg-card/60 border-border backdrop-blur-xl rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse text-foreground">
                <Users className="h-5 w-5 text-emerald-400" />
                <span>الشجرة التفاعلية</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50" />
                </div>
              ) : tree.length === 0 ? (
                <div className="text-muted-foreground text-sm">لا يوجد قادة</div>
              ) : (
                <div className="space-y-3">
                  {tree.map((leader) => (
                    <TreeNodeView
                      key={leader.id}
                      node={leader}
                      expanded={expanded}
                      showDetails={showDetails}
                      selectedNodeId={selectedNodeId}
                      onToggleExpansion={toggleExpansion}
                      onToggleDetails={toggleDetails}
                      onSelectNode={selectNode}
                      level={0}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details Panel */}
          <Card className="bg-card/60 border-border backdrop-blur-xl rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 space-x-reverse text-foreground">
                <Info className="h-5 w-5 text-sky-400" />
                <span>التفاصيل</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <NodeDetailsView node={selectedNode} />
              ) : (
                <div className="text-muted-foreground text-sm text-center py-8">
                  اضغط على أي قائد أو فرد في الشجرة لعرض تفاصيله
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function TreeNodeView({
  node,
  expanded,
  onToggle,
  level = 0,
}: {
  node: any;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  level?: number;
}) {
  const isExpandable = (node.children?.length || 0) > 0;
  const isOpen = expanded[node.id] ?? false;

  return (
    <div className="ml-2">
      <div
        className={`flex items-center py-2 px-3 rounded-lg border backdrop-blur-xl text-gray-100 ${
          node.type === 'leader'
            ? 'bg-white/20 border-white/25'
            : 'bg-white/10 border-white/15'
        }`}
        style={{ marginInlineStart: level * 16 }}
      >
        {isExpandable ? (
          <button
            onClick={() => onToggle(node.id)}
            className="mr-2 text-gray-200 hover:text-white"
            aria-label={isOpen ? 'طي' : 'فتح'}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="mr-6" />
        )}

        <span className="font-medium text-white">{node.label}</span>
        {typeof node.votes === 'number' && (
          <span className="ml-auto text-xs text-gray-200">أصوات: {node.votes}</span>
        )}
      </div>

      {isExpandable && isOpen && (
        <div className="mt-2 space-y-2">
          {node.children!.map((child: any) => (
            <TreeNodeView
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}