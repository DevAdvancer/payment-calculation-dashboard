export async function GET() {
  const res = await fetch(
    `https://api.unirateapi.com/api/rates?api_key=${process.env.UNIRATE_API_KEY}&from=GBP&to=USD`
  );

  const data = await res.json();
  return Response.json(data);
}