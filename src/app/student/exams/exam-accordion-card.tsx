import { LiveExam } from "@/types/tests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export interface ExamAccordionCardProps {
  exam: LiveExam;
  onTakeExam: () => void;
  onViewResults: () => void;
}

export const ExamAccordionCard: React.FC<ExamAccordionCardProps> = ({
  exam,
  onTakeExam,
  onViewResults
}) => {
  const status = exam.status === 'active' ? 'active' :
    exam.status === 'scheduled' ? 'upcoming' : 'past';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{exam.title}</CardTitle>
        <CardDescription>
          {exam.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Başlangıç: {formatDistanceToNow(new Date(exam.scheduledStartTime), { addSuffix: true, locale: tr })}
          </p>
          <p className="text-sm text-gray-500">
            Bitiş: {formatDistanceToNow(new Date(exam.scheduledEndTime), { addSuffix: true, locale: tr })}
          </p>
        </div>
      </CardContent>
      <CardFooter>
        {status === 'active' && (
          <Button onClick={onTakeExam} className="w-full">
            Sınava Başla
          </Button>
        )}
        {status === 'upcoming' && (
          <Button disabled className="w-full">
            Sınav Henüz Başlamadı
          </Button>
        )}
        {status === 'past' && (
          <Button onClick={onViewResults} className="w-full">
            Sonuçları Görüntüle
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}; 