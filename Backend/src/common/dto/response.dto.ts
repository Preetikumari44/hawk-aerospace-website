export class ResponseDto<T> {
  success!: boolean;
  data!: T;
  timestamp!: string;
}
