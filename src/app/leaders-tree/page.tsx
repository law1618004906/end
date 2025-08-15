'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Users, 
  Crown, 
  ChevronDown, 
  ChevronLeft, 
  Home, 
  Info,
  Phone,
  MapPin,
  Building,
  Vote
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

interface NodeDetails {
  full_name?: string;
  phone?: string;
  residence?: string;
  workplace?: string;
  center_info?: string;
  station_number?: string;
}

interface TreeNode {
  id: string;
  label: string;
  type: 'leader' | 'individual';
  votes?: number;
  totalVotes?: number;
  details?: NodeDetails;
  children?: TreeNode[];
}

export default function LeadersTreePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTreeData();
    }
  }, [user]);

  const fetchTreeData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/leaders-tree');
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, redirect to login
          router.push('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Ensure data is an array
      if (Array.isArray(data)) {
        setTree(data);
      } else {
        console.warn('API returned non-array data:', data);
        setTree([]);
      }
    } catch (error) {
      console.error('Error fetching tree data:', error);
      // If it's an auth error, redirect to login
      if (error instanceof Error && error.message.includes('401')) {
        router.push('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpansion = (id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const selectNode = (node: TreeNode) => {
    setSelectedNode(node);
    setSelectedNodeId(node.id);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.15_0.02_280)] to-[oklch(0.05_0.01_280)] flex items-center justify-center">
        <div className="text-white text-center space-y-4">
          <p className="text-lg">يرجى تسجيل الدخول للوصول إلى هذه الصفحة</p>
          <Button
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            تسجيل الدخول
          </Button>
        </div>
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
              ) : !Array.isArray(tree) || tree.length === 0 ? (
                <div className="text-muted-foreground text-sm">لا يوجد قادة</div>
              ) : (
                <div className="space-y-3">
                  {tree.map((leader) => (
                    <TreeNodeView
                      key={leader.id}
                      node={leader}
                      expanded={expanded}
                      selectedNodeId={selectedNodeId}
                      onToggleExpansion={toggleExpansion}
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

// Tree Node View Component
function TreeNodeView({
  node,
  expanded,
  selectedNodeId,
  onToggleExpansion,
  onSelectNode,
  level = 0
}: {
  node: TreeNode;
  expanded: Record<string, boolean>;
  selectedNodeId: string | null;
  onToggleExpansion: (id: string) => void;
  onSelectNode: (node: TreeNode) => void;
  level?: number;
}) {
  const isExpanded = expanded[node.id];
  const isSelected = selectedNodeId === node.id;
  
  const handleClick = () => {
    onSelectNode(node);
    if (node.children && node.children.length > 0) {
      onToggleExpansion(node.id);
    }
  };

  return (
    <div className={`border border-border rounded-lg p-3 ${level > 0 ? 'mr-6' : ''}`}>
      <div 
        className={`flex items-center justify-between cursor-pointer p-2 rounded-lg transition-all ${
          isSelected 
            ? 'bg-blue-600/30 border border-blue-400/50' 
            : 'bg-card/40 hover:bg-card/60 border border-border'
        }`}
        onClick={handleClick}
      >
        <div className="flex items-center space-x-2 space-x-reverse">
          {node.children && node.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpansion(node.id);
              }}
              className="p-1 rounded hover:bg-card/60 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
          
          {node.type === 'leader' ? (
            <Crown className="h-4 w-4 text-amber-400" />
          ) : (
            <User className="h-4 w-4 text-sky-400" />
          )}
          
          <span className="font-medium text-foreground">{node.label}</span>
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          {node.type === 'leader' && (
            <span className="text-xs bg-emerald-600/20 text-emerald-300 px-2 py-1 rounded-full">
              إجمالي الأصوات: {node.totalVotes || 0}
            </span>
          )}
          {node.votes !== undefined && (
            <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-1 rounded-full">
              أصوات: {node.votes}
            </span>
          )}
        </div>
      </div>

      {/* Expanded Children */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div className="mt-3 space-y-2">
          {node.children.map((child) => (
            <TreeNodeView
              key={child.id}
              node={child}
              expanded={expanded}
              selectedNodeId={selectedNodeId}
              onToggleExpansion={onToggleExpansion}
              onSelectNode={onSelectNode}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Node Details View Component
function NodeDetailsView({ node }: { node: TreeNode }) {
  const details = node.details;
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3 space-x-reverse">
        {node.type === 'leader' ? (
          <Crown className="h-6 w-6 text-amber-400" />
        ) : (
          <User className="h-6 w-6 text-sky-400" />
        )}
        <div>
          <h3 className="text-lg font-semibold text-foreground">{node.label}</h3>
          <p className="text-sm text-muted-foreground">
            {node.type === 'leader' ? 'قائد' : 'فرد'}
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 gap-3">
        {details?.full_name && (
          <InfoItem 
            icon={<User className="h-4 w-4" />}
            label="الاسم الكامل"
            value={details.full_name}
          />
        )}
        
        {details?.phone && (
          <InfoItem 
            icon={<Phone className="h-4 w-4" />}
            label="رقم الهاتف"
            value={details.phone}
          />
        )}
        
        {details?.residence && (
          <InfoItem 
            icon={<MapPin className="h-4 w-4" />}
            label="السكن"
            value={details.residence}
          />
        )}
        
        {details?.workplace && (
          <InfoItem 
            icon={<Building className="h-4 w-4" />}
            label="مكان العمل"
            value={details.workplace}
          />
        )}
      </div>

      {/* Voting Info */}
      {(node.votes !== undefined || node.totalVotes !== undefined) && (
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2 space-x-reverse">
            <Vote className="h-4 w-4" />
            <span>معلومات التصويت</span>
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {node.votes !== undefined && (
              <div className="flex justify-between items-center p-2 bg-card/40 rounded-lg">
                <span className="text-sm text-muted-foreground">الأصوات الشخصية</span>
                <span className="text-sm font-medium text-blue-300">{node.votes}</span>
              </div>
            )}
            {node.totalVotes !== undefined && (
              <div className="flex justify-between items-center p-2 bg-card/40 rounded-lg">
                <span className="text-sm text-muted-foreground">إجمالي الأصوات</span>
                <span className="text-sm font-medium text-emerald-300">{node.totalVotes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Election Center Info */}
      {(details?.center_info || details?.station_number) && (
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2 space-x-reverse">
            <MapPin className="h-4 w-4" />
            <span>معلومات المركز الانتخابي</span>
          </h4>
          <div className="space-y-2">
            {details.center_info && (
              <InfoItem 
                label="معلومات المركز"
                value={details.center_info}
              />
            )}
            {details.station_number && (
              <InfoItem 
                label="رقم المحطة"
                value={details.station_number}
              />
            )}
          </div>
        </div>
      )}

      {/* Children Count */}
      {node.children && node.children.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="flex justify-between items-center p-2 bg-card/40 rounded-lg">
            <span className="text-sm text-muted-foreground">عدد الأفراد المرتبطين</span>
            <span className="text-sm font-medium text-foreground">{node.children.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for displaying information items
function InfoItem({ 
  icon, 
  label, 
  value 
}: { 
  icon?: React.ReactNode; 
  label: string; 
  value: string | number | null | undefined; 
}) {
  if (!value) return null;
  
  return (
    <div className="flex items-start space-x-3 space-x-reverse p-2 bg-card/40 rounded-lg">
      {icon && (
        <div className="text-muted-foreground mt-0.5">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}
