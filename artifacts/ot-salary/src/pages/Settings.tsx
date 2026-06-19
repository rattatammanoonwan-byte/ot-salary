import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  useGetSettings,
  useUpsertSettings,
  getGetSettingsQueryKey,
  getGetMonthlySummaryQueryKey,
  getGetYearlySummaryQueryKey,
} from "@workspace/api-client-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

import { Save } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  employeeType: z.enum(["monthly", "daily"]),

  baseSalary: z.coerce.number().min(0),
  otRate: z.coerce.number(),
  hoursPerDay: z.coerce.number(),
  workingDaysPerMonth: z.coerce.number(),

  transportAllowance: z.coerce.number(),
  mealAllowance: z.coerce.number(),
  otMealAllowance: z.coerce.number(),
  diligenceAllowance: z.coerce.number(),
  shiftAllowance: z.coerce.number(),
  extraAllowance: z.coerce.number(),
  bonusAllowance: z.coerce.number(),
});

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();

  const upsertMutation = useUpsertSettings();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),

    defaultValues: {
      employeeType: "monthly",

      baseSalary: 15000,
      otRate: 1.5,
      hoursPerDay: 8,
      workingDaysPerMonth: 30,

      transportAllowance: 0,
      mealAllowance: 0,
      otMealAllowance: 0,
      diligenceAllowance: 0,
      shiftAllowance: 0,
      extraAllowance: 0,
      bonusAllowance: 0,
    },
  });

  useEffect(() => {
    if (!settings) return;

    console.log(
      "API employeeType:",
      settings.employeeType
    );

    form.setValue(
      "employeeType",
      settings.employeeType === "daily"
        ? "daily"
        : "monthly"
    );

    form.setValue(
      "baseSalary",
      settings.baseSalary ?? 15000
    );

    form.setValue(
      "otRate",
      settings.otRate ?? 1.5
    );

    form.setValue(
      "hoursPerDay",
      settings.hoursPerDay ?? 8
    );

    form.setValue(
      "workingDaysPerMonth",
      settings.workingDaysPerMonth ?? 30
    );

    form.setValue(
      "transportAllowance",
      settings.transportAllowance ?? 0
    );

    form.setValue(
      "mealAllowance",
      settings.mealAllowance ?? 0
    );

    form.setValue(
      "otMealAllowance",
      settings.otMealAllowance ?? 0
    );

    form.setValue(
      "diligenceAllowance",
      settings.diligenceAllowance ?? 0
    );

    form.setValue(
      "shiftAllowance",
      settings.shiftAllowance ?? 0
    );

    form.setValue(
      "extraAllowance",
      settings.extraAllowance ?? 0
    );

    form.setValue(
      "bonusAllowance",
      settings.bonusAllowance ?? 0
    );

  }, [settings]);

  function onSubmit(
    values: z.infer<typeof formSchema>
  ) {
    console.log("Submit:", values);

    upsertMutation.mutate(
      {
        data: {
          ...values,
          employmentStartDate:
            startDate || null,
        } as any,
      },
      {
        onSuccess: (data) => {

          queryClient.setQueryData(
            getGetSettingsQueryKey(),
            data
          );

          queryClient.invalidateQueries({
            queryKey:
              getGetMonthlySummaryQueryKey(),
          });

          queryClient.invalidateQueries({
            queryKey:
              getGetYearlySummaryQueryKey(),
          });

          toast({
            title: "บันทึกสำเร็จ",
          });
        },

        onError: () => {
          toast({
            title: "เกิดข้อผิดพลาด",
            variant: "destructive",
          });
        },
      }
    );
  }

  console.log(
    "watch:",
    form.watch("employeeType")
  );

  return (
    <Card>

      <CardHeader>
        <CardTitle>
          ตั้งค่า
        </CardTitle>

        <CardDescription>
          ตั้งค่าข้อมูลพนักงาน
        </CardDescription>

      </CardHeader>

      <CardContent>

        {isLoading ? (
          <Skeleton className="h-10 w-full"/>
        ) : (

          <Form {...form}>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >

              <FormField
                control={form.control}
                name="employeeType"
                render={({ field }) => (

                  <FormItem>

                    <FormLabel>
                      ประเภทพนักงาน
                    </FormLabel>

                    <Select
                      value={
                        field.value ??
                        "monthly"
                      }
                      onValueChange={
                        field.onChange
                      }
                    >

                      <FormControl>

                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภทพนักงาน" />
                        </SelectTrigger>

                      </FormControl>

                      <SelectContent>

                        <SelectItem value="monthly">
                          พนักงานรายเดือน
                        </SelectItem>

                        <SelectItem value="daily">
                          พนักงานรายวัน
                        </SelectItem>

                      </SelectContent>

                    </Select>

                    <FormMessage />

                  </FormItem>

                )}
              />

              <FormField
                control={form.control}
                name="baseSalary"
                render={({ field }) => (

                  <FormItem>

                    <FormLabel>
                      ฐานเงินเดือน
                    </FormLabel>

                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                      />
                    </FormControl>

                  </FormItem>

                )}
              />

              <Button
                type="submit"
                disabled={
                  upsertMutation.isPending
                }
              >

                <Save className="w-4 h-4 mr-2" />

                {upsertMutation.isPending
                  ? "กำลังบันทึก..."
                  : "บันทึก"}

              </Button>

            </form>

          </Form>

        )}

      </CardContent>

    </Card>
  );
}
