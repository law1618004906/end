'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Plus, 
  Search, 
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Eye,
  TrendingUp,
  MapPin,
  Phone,
  Building,
  Vote,
  Users2,
  FileDown,
  SortAsc,
  SortDesc,
  ArrowUpDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

type LeaderItem = {
  id: number;
  full_name: string;
  residence: string | null;
  phone: string | null;
  workplace: string | null;
  center_info: string | null;
  station_number: string | null;
  votes_count: number;
  created_at: string;
  updated_at: string;
  _count?: {
    individuals?: number;
  };
  totalIndividualsVotes?: number;
};

type SortField = 'id' | 'votes_count' | 'full_name';
type SortOrder = 'asc' | 'desc';

const LeadersPage = () => {
  const [leaders, setLeaders] = useState<LeaderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Edit/Add leader modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState<LeaderItem | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    residence: '',
    phone: '',
    workplace: '',
    center_info: '',
    station_number: '',
    votes_count: 0
  });

  // Fetch leaders data
  const fetchLeaders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leaders');
      if (response.ok) {
        const result = await response.json();
        // API يرجع البيانات في تنسيق { success: true, data: [...] }
        const data = result.data || result;
        // تأكد من أن البيانات مصفوفة
        if (Array.isArray(data)) {
          setLeaders(data);
        } else {
          console.error('البيانات المرجعة ليست مصفوفة:', result);
          setLeaders([]);
        }
      } else {
        throw new Error('Failed to fetch leaders');
      }
    } catch (error) {
      console.error('Error fetching leaders:', error);
      setLeaders([]); // تعيين مصفوفة فارغة في حالة الخطأ
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات القادة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaders();
  }, []);

  // Filter and sort leaders
  const filteredAndSortedLeaders = useMemo(() => {
    // تأكد من أن leaders هو مصفوفة قبل استخدام filter
    if (!Array.isArray(leaders)) {
      return [];
    }
    
    let filtered = leaders.filter(leader =>
      leader.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leader.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leader.workplace?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      leader.residence?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'full_name') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [leaders, searchTerm, sortField, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalVotes = leaders.reduce((sum, leader) => sum + (leader.votes_count || 0), 0);
    const totalIndividualsVotes = leaders.reduce((sum, leader) => sum + (leader.totalIndividualsVotes || 0), 0);
    const totalIndividuals = leaders.reduce((sum, leader) => sum + (leader._count?.individuals || 0), 0);
    
    return {
      totalLeaders: leaders.length,
      totalVotes,
      totalIndividualsVotes,
      totalIndividuals,
      grandTotal: totalVotes + totalIndividualsVotes
    };
  }, [leaders]);

  // Handle form operations
  const openAddModal = () => {
    setEditingLeader(null);
    setEditForm({
      full_name: '',
      residence: '',
      phone: '',
      workplace: '',
      center_info: '',
      station_number: '',
      votes_count: 0
    });
    setIsEditModalOpen(true);
  };

  const openEditModal = (leader: LeaderItem) => {
    setEditingLeader(leader);
    setEditForm({
      full_name: leader.full_name,
      residence: leader.residence || '',
      phone: leader.phone || '',
      workplace: leader.workplace || '',
      center_info: leader.center_info || '',
      station_number: leader.station_number || '',
      votes_count: leader.votes_count || 0
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingLeader ? `/api/leaders/${editingLeader.id}` : '/api/leaders';
      const method = editingLeader ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "نجح",
          description: editingLeader ? "تم تحديث القائد بنجاح" : "تم إضافة القائد بنجاح",
        });
        setIsEditModalOpen(false);
        fetchLeaders();
      } else {
        // قراءة تفاصيل الخطأ من API
        const errorData = await response.json();
        const errorMessage = errorData.error || 'فشل في حفظ بيانات القائد';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving leader:', error);
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل في حفظ بيانات القائد",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا القائد؟ سيؤثر هذا على جميع الأفراد المرتبطين به.')) return;
    
    try {
      const response = await fetch(`/api/leaders/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "نجح",
          description: "تم حذف القائد بنجاح",
        });
        fetchLeaders();
      } else {
        // قراءة تفاصيل الخطأ من API
        const errorData = await response.json();
        const errorMessage = errorData.error || 'فشل في حذف القائد';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error deleting leader:', error);
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل في حذف القائد",
        variant: "destructive",
      });
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvContent = [
      ['الرقم', 'الاسم الكامل', 'السكن', 'الهاتف', 'جهة العمل', 'معلومات المركز', 'رقم المحطة', 'أصوات القائد', 'عدد الأفراد', 'أصوات الأفراد', 'المجموع'],
      ...filteredAndSortedLeaders.map(leader => [
        leader.id,
        leader.full_name,
        leader.residence || '',
        leader.phone || '',
        leader.workplace || '',
        leader.center_info || '',
        leader.station_number || '',
        leader.votes_count || 0,
        leader._count?.individuals || 0,
        leader.totalIndividualsVotes || 0,
        (leader.votes_count || 0) + (leader.totalIndividualsVotes || 0)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leaders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">إدارة القادة</h1>
        <p className="text-muted-foreground">إدارة وعرض بيانات القادة والمشرفين</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold">{stats.totalLeaders}</p>
                <p className="text-muted-foreground">إجمالي القادة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Vote className="h-8 w-8 text-green-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold">{stats.totalVotes}</p>
                <p className="text-muted-foreground">أصوات القادة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users2 className="h-8 w-8 text-purple-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold">{stats.totalIndividuals}</p>
                <p className="text-muted-foreground">إجمالي الأفراد</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold">{stats.grandTotal}</p>
                <p className="text-muted-foreground">المجموع الكلي</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="bg-card/60 border-border rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الاسم، الهاتف، السكن، أو جهة العمل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 ml-2" />
            إضافة قائد جديد
          </Button>
          
          <Button onClick={exportToCSV} variant="outline">
            <FileDown className="h-4 w-4 ml-2" />
            تصدير CSV
          </Button>

          <Button
            onClick={() => toggleSort('id')}
            variant="outline"
            className="flex items-center gap-2"
          >
            ترتيب حسب الرقم
            {sortField === 'id' && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
            )}
            {sortField !== 'id' && <ArrowUpDown className="h-4 w-4" />}
          </Button>

          <Button
            onClick={() => toggleSort('full_name')}
            variant="outline"
            className="flex items-center gap-2"
          >
            ترتيب حسب الاسم
            {sortField === 'full_name' && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
            )}
            {sortField !== 'full_name' && <ArrowUpDown className="h-4 w-4" />}
          </Button>

          <Button
            onClick={() => toggleSort('votes_count')}
            variant="outline"
            className="flex items-center gap-2"
          >
            ترتيب حسب الأصوات
            {sortField === 'votes_count' && (
              sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
            )}
            {sortField !== 'votes_count' && <ArrowUpDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Leaders Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedLeaders.map((leader) => (
            <Card key={leader.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground mb-1">
                      {leader.full_name}
                    </h3>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      قائد #{leader.id}
                    </Badge>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditModal(leader)}>
                        <Edit className="mr-2 h-4 w-4" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(leader.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        حذف
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 mb-4">
                  {leader.residence && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 ml-2 text-muted-foreground/70" />
                      {leader.residence}
                    </div>
                  )}
                  
                  {leader.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 ml-2 text-muted-foreground/70" />
                      {leader.phone}
                    </div>
                  )}
                  
                  {leader.workplace && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Building className="h-4 w-4 ml-2 text-muted-foreground/70" />
                      {leader.workplace}
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <p className="text-lg font-semibold text-green-700">
                      {leader.votes_count || 0}
                    </p>
                    <p className="text-xs text-green-600">أصوات القائد</p>
                  </div>
                  
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <p className="text-lg font-semibold text-blue-700">
                      {leader._count?.individuals || 0}
                    </p>
                    <p className="text-xs text-blue-600">عدد الأفراد</p>
                  </div>
                </div>

                {/* Total votes */}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">المجموع الكلي:</span>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {(leader.votes_count || 0) + (leader.totalIndividualsVotes || 0)} صوت
                    </Badge>
                  </div>
                </div>

                {leader.station_number && (
                  <div className="mt-3 pt-3 border-t">
                    <Badge variant="outline" className="text-xs">
                      المحطة {leader.station_number}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredAndSortedLeaders.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">لا توجد نتائج</h3>
          <p className="text-muted-foreground">لم يتم العثور على قادة مطابقين لمعايير البحث</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingLeader ? 'تعديل بيانات القائد' : 'إضافة قائد جديد'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">الاسم الكامل *</Label>
                <Input
                  id="full_name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="residence">السكن</Label>
                <Input
                  id="residence"
                  value={editForm.residence}
                  onChange={(e) => setEditForm(prev => ({ ...prev, residence: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="workplace">جهة العمل</Label>
                <Input
                  id="workplace"
                  value={editForm.workplace}
                  onChange={(e) => setEditForm(prev => ({ ...prev, workplace: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="center_info">معلومات المركز</Label>
                <Input
                  id="center_info"
                  value={editForm.center_info}
                  onChange={(e) => setEditForm(prev => ({ ...prev, center_info: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="station_number">رقم المحطة</Label>
                <Input
                  id="station_number"
                  value={editForm.station_number}
                  onChange={(e) => setEditForm(prev => ({ ...prev, station_number: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="votes_count">عدد الأصوات</Label>
                <Input
                  id="votes_count"
                  type="number"
                  min="0"
                  value={editForm.votes_count}
                  onChange={(e) => setEditForm(prev => ({ ...prev, votes_count: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingLeader ? 'تحديث' : 'إضافة'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadersPage;
